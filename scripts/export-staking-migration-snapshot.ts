/**
 * 第一步：生成本地「应写入新合约」的完整迁移快照 JSON（链上只读 + 可选 DB 扣减 RWA 多付）
 *
 * - 从当前质押合约拉取：users / rwaStakes / 灵活仓 / 锁仓数组 / stakeHistory / 全局计数
 * - 若连接 DB（与 backend 相同 .env）：按重复快照审计逻辑扣减 rwaStakes.rwaPending（仅 RWA 路径多付）
 * - 另导出：RewardsUpdated 涉及的 stakeId（processed 语义）、matured burn 标记（当前 migrationImport 未写入，供后续补丁）
 *
 * 用法（需能访问 BSC RPC）：
 *   npx hardhat run scripts/export-staking-migration-snapshot.ts --network bscMainnet
 *
 * 环境变量：
 *   STAKING_CONTRACT_ADDRESS（或 .env）
 *   STAKING_DEPLOY_BLOCK（建议配置，否则用 STAKING_LOG_SCAN_LOOKBACK 默认 120000）
 *   SKIP_DB_OVERPAY=1  — 不连库，仅导出链上原样
 *   MIGRATION_EXPORT_DIR — 输出目录，默认 migration-export
 *
 * 输出：migration-export/migration-snapshot-{chainId}-{timestamp}.json
 */
import * as fs from "fs";
import * as path from "path";
import { ethers, id, type Log } from "ethers";
import hre from "hardhat";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { computeRwaOverpayWeiByAddress } from "./lib/rwa-overpay-from-db";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

const STAKE_TOPIC = id("StakeEvent(address,uint256,address,uint256,uint256,uint256)");
const RWA_STAKE_TOPIC = id("RWAStakeEvent(address,uint256,address,uint256,uint256,uint256)");
const REWARDS_TOPIC = id("RewardsUpdated(address,uint256,uint256,uint256,uint256)");

const MAX_LOCK_INDEX = 256;
const MAX_HISTORY_INDEX = 512;
const LOG_CHUNK = 4000;

function topicAddr(topic: string): string {
  return ethers.getAddress("0x" + topic.slice(26));
}

async function getLogsChunked(
  provider: ethers.Provider,
  filter: { address: string; topics: (string | null)[] },
  fromBlock: number,
  toBlock: number
): Promise<Log[]> {
  const out: Log[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + LOG_CHUNK - 1, toBlock);
    const part = await provider.getLogs({
      ...filter,
      fromBlock: start,
      toBlock: end,
    });
    out.push(...part);
    start = end + 1;
  }
  return out;
}

function pickUserInfo(r: ethers.Result | Record<string, unknown>) {
  const x = r as Record<string, unknown>;
  return {
    totalStaked: BigInt(String(x.totalStaked ?? (r as unknown[])[0])),
    rwaPending: BigInt(String(x.rwaPending ?? (r as unknown[])[1])),
    usdtRewards: BigInt(String(x.usdtRewards ?? (r as unknown[])[2])),
    lastWithdrawTime: BigInt(String(x.lastWithdrawTime ?? (r as unknown[])[3])),
    referrer: String(x.referrer ?? (r as unknown[])[4]),
    firstStakeTime: BigInt(String(x.firstStakeTime ?? (r as unknown[])[5])),
    nodeLevel: Number(x.nodeLevel ?? (r as unknown[])[6]),
    isActive: Boolean(x.isActive ?? (r as unknown[])[7]),
  };
}

function pickRwaStake(r: ethers.Result | Record<string, unknown>) {
  const x = r as Record<string, unknown>;
  return {
    totalStakedRWA: BigInt(String(x.totalStakedRWA ?? (r as unknown[])[0])),
    rwaPending: BigInt(String(x.rwaPending ?? (r as unknown[])[1])),
    lastWithdrawTime: BigInt(String(x.lastWithdrawTime ?? (r as unknown[])[2])),
    referrer: String(x.referrer ?? (r as unknown[])[3]),
    firstStakeTime: BigInt(String(x.firstStakeTime ?? (r as unknown[])[4])),
    nodeLevel: Number(x.nodeLevel ?? (r as unknown[])[5]),
    isActive: Boolean(x.isActive ?? (r as unknown[])[6]),
  };
}

async function readMappingArray<T>(
  contract: ethers.Contract,
  fnName: string,
  user: string,
  max: number,
  mapRow: (row: ethers.Result) => T
): Promise<T[]> {
  const out: T[] = [];
  const fn = contract.getFunction(fnName);
  for (let i = 0; i < max; i++) {
    try {
      const row = await fn(user, i);
      out.push(mapRow(row as ethers.Result));
    } catch {
      break;
    }
  }
  return out;
}

async function main() {
  const stakingAddr =
    process.env.STAKING_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS ||
    "";
  if (!stakingAddr) {
    throw new Error("请设置 STAKING_CONTRACT_ADDRESS");
  }

  const provider = hre.ethers.provider;
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);
  const latest = await provider.getBlockNumber();

  let fromBlock = parseInt(process.env.STAKING_DEPLOY_BLOCK || "", 10);
  if (!Number.isFinite(fromBlock) || fromBlock < 0) {
    const lookback = parseInt(process.env.STAKING_LOG_SCAN_LOOKBACK || "120000", 10) || 120000;
    fromBlock = Math.max(0, latest - lookback);
    console.warn(
      `[export] STAKING_DEPLOY_BLOCK 未设，日志自 latest-${lookback} = ${fromBlock} 扫描，可能漏地址`
    );
  }

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/StakingContract.sol/StakingContract.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: unknown[] };
  const staking = new ethers.Contract(stakingAddr, artifact.abi, provider);

  const [logsStake, logsRwa] = await Promise.all([
    getLogsChunked(provider, { address: stakingAddr, topics: [STAKE_TOPIC] }, fromBlock, latest),
    getLogsChunked(provider, { address: stakingAddr, topics: [RWA_STAKE_TOPIC] }, fromBlock, latest),
  ]);

  const stakerSet = new Set<string>();
  for (const log of [...logsStake, ...logsRwa]) {
    if (log.topics.length < 2) continue;
    try {
      stakerSet.add(topicAddr(log.topics[1]).toLowerCase());
    } catch {
      /* skip */
    }
  }

  const stakers = [...stakerSet].sort();
  console.log(`[export] 发现质押地址数: ${stakers.length} (块 ${fromBlock}..${latest})`);

  const rewardsLogs = await getLogsChunked(
    provider,
    { address: stakingAddr, topics: [REWARDS_TOPIC] },
    fromBlock,
    latest
  );
  const processedStakeIds = new Set<string>();
  for (const log of rewardsLogs) {
    if (log.topics.length < 3) continue;
    try {
      const stakeTopic = log.topics[2];
      processedStakeIds.add(BigInt(stakeTopic).toString());
    } catch {
      /* skip */
    }
  }

  let overpayMap = new Map<string, bigint>();
  if (process.env.SKIP_DB_OVERPAY !== "1") {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306", 10),
        user: process.env.DB_USER || "rwa_user",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "rwa_protocol",
      });
      overpayMap = await computeRwaOverpayWeiByAddress(conn);
      await conn.end();
      console.log(`[export] DB 多付(RWA)地址数: ${overpayMap.size}`);
    } catch (e) {
      console.warn("[export] DB 不可用，跳过扣减（仅链上原样）:", (e as Error).message);
    }
  } else {
    console.log("[export] SKIP_DB_OVERPAY=1，不扣减 rwaPending");
  }

  const usersFn = staking.getFunction("users");
  const rwaStakesFn = staking.getFunction("rwaStakes");
  const usdtFlexP = staking.getFunction("usdtFlexiblePrincipal");
  const usdtFlexT = staking.getFunction("usdtFlexibleTotalStaked");
  const rwaFlexP = staking.getFunction("rwaFlexiblePrincipal");
  const rwaFlexT = staking.getFunction("rwaFlexibleTotalStaked");
  const maturedUsdt = staking.getFunction("usdtMaturedStRwaBurned");
  const maturedRwa = staking.getFunction("rwaMaturedStRwaBurned");

  const bundles: unknown[] = [];
  const maturedBurns: { user: string; kind: "usdt" | "rwa"; lockIndex: number }[] = [];

  for (const user of stakers) {
    const u = ethers.getAddress(user);

    const uRow = pickUserInfo(await usersFn(u));
    const rRow = pickRwaStake(await rwaStakesFn(u));

    const uInfo = {
      totalStaked: uRow.totalStaked.toString(),
      rwaPending: uRow.rwaPending.toString(),
      usdtRewards: uRow.usdtRewards.toString(),
      lastWithdrawTime: uRow.lastWithdrawTime.toString(),
      referrer: uRow.referrer,
      firstStakeTime: uRow.firstStakeTime.toString(),
      nodeLevel: uRow.nodeLevel,
      isActive: uRow.isActive,
    };

    let rwaPendingChain = rRow.rwaPending;
    const overpay = overpayMap.get(user) ?? 0n;
    let rwaPendingCorrected = rwaPendingChain;
    if (overpay > 0n) {
      rwaPendingCorrected = rwaPendingChain > overpay ? rwaPendingChain - overpay : 0n;
    }

    const rInfo = {
      totalStakedRWA: rRow.totalStakedRWA.toString(),
      rwaPending: rwaPendingCorrected.toString(),
      lastWithdrawTime: rRow.lastWithdrawTime.toString(),
      referrer: rRow.referrer,
      firstStakeTime: rRow.firstStakeTime.toString(),
      nodeLevel: rRow.nodeLevel,
      isActive: rRow.isActive,
    };

    const usdtLocks = await readMappingArray(
      staking,
      "usdtLockedPrincipals",
      u,
      MAX_LOCK_INDEX,
      (row) => {
        const x = row as Record<string, unknown>;
        return {
          stakeId: BigInt(String(x.stakeId ?? (row as unknown[])[0])).toString(),
          totalAmount: BigInt(String(x.totalAmount ?? (row as unknown[])[1])).toString(),
          principalAmount: BigInt(String(x.principalAmount ?? (row as unknown[])[2])).toString(),
          lockStartTime: BigInt(String(x.lockStartTime ?? (row as unknown[])[3])).toString(),
          lockEndTime: BigInt(String(x.lockEndTime ?? (row as unknown[])[4])).toString(),
          isWithdrawn: Boolean(x.isWithdrawn ?? (row as unknown[])[5]),
          lockPeriod: BigInt(String(x.lockPeriod ?? (row as unknown[])[6])).toString(),
        };
      }
    );

    const rwaLocks = await readMappingArray(
      staking,
      "rwaLockedPrincipals",
      u,
      MAX_LOCK_INDEX,
      (row) => {
        const x = row as Record<string, unknown>;
        return {
          stakeId: BigInt(String(x.stakeId ?? (row as unknown[])[0])).toString(),
          totalAmount: BigInt(String(x.totalAmount ?? (row as unknown[])[1])).toString(),
          principalAmount: BigInt(String(x.principalAmount ?? (row as unknown[])[2])).toString(),
          lockStartTime: BigInt(String(x.lockStartTime ?? (row as unknown[])[3])).toString(),
          lockEndTime: BigInt(String(x.lockEndTime ?? (row as unknown[])[4])).toString(),
          isWithdrawn: Boolean(x.isWithdrawn ?? (row as unknown[])[5]),
          lockPeriod: BigInt(String(x.lockPeriod ?? (row as unknown[])[6])).toString(),
        };
      }
    );

    const hist = await readMappingArray(
      staking,
      "stakeHistory",
      u,
      MAX_HISTORY_INDEX,
      (row) => {
        const x = row as Record<string, unknown>;
        return {
          amount: BigInt(String(x.amount ?? (row as unknown[])[0])).toString(),
          timestamp: BigInt(String(x.timestamp ?? (row as unknown[])[1])).toString(),
        };
      }
    );

    for (let i = 0; i < usdtLocks.length; i++) {
      try {
        if (await maturedUsdt(u, i)) maturedBurns.push({ user: u, kind: "usdt", lockIndex: i });
      } catch {
        /* */
      }
    }
    for (let i = 0; i < rwaLocks.length; i++) {
      try {
        if (await maturedRwa(u, i)) maturedBurns.push({ user: u, kind: "rwa", lockIndex: i });
      } catch {
        /* */
      }
    }

    const usdtFlexPrincipal_ = (await usdtFlexP(u)).toString();
    const usdtFlexTotal_ = (await usdtFlexT(u)).toString();
    const rwaFlexPrincipal_ = (await rwaFlexP(u)).toString();
    const rwaFlexTotal_ = (await rwaFlexT(u)).toString();

    const globalDeltaTotalStaked = uRow.totalStaked.toString();
    const globalDeltaTotalStakedRWA = rRow.totalStakedRWA.toString();

    const hasAny =
      BigInt(uInfo.totalStaked) > 0n ||
      BigInt(uInfo.rwaPending) > 0n ||
      BigInt(uInfo.usdtRewards) > 0n ||
      BigInt(rInfo.totalStakedRWA) > 0n ||
      BigInt(rInfo.rwaPending) > 0n ||
      usdtLocks.length > 0 ||
      rwaLocks.length > 0 ||
      BigInt(usdtFlexPrincipal_) > 0n ||
      BigInt(rwaFlexTotal_) > 0n;

    if (!hasAny) continue;

    bundles.push({
      user: u,
      uInfo,
      rInfo,
      usdtLocks,
      rwaLocks,
      usdtFlexPrincipal_,
      usdtFlexTotal_,
      rwaFlexPrincipal_,
      rwaFlexTotal_,
      hist,
      globalDeltaTotalStaked,
      globalDeltaTotalStakedRWA,
      _meta: {
        rwaPendingOnChain: rwaPendingChain.toString(),
        rwaOverpayDeductedWei: overpay.toString(),
        rwaPendingCorrected: rwaPendingCorrected.toString(),
      },
    });
  }

  const stakesCounter = (await staking.stakesCounter()).toString();
  const totalStaked = (await staking.totalStaked()).toString();
  const totalStakedRWA = (await staking.totalStakedRWA()).toString();
  const totalDynamicRewardsPaid = (await staking.getTotalDynamicRewardsPaid()).toString();

  const outDir = process.env.MIGRATION_EXPORT_DIR || path.join(__dirname, "../migration-export");
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `migration-snapshot-${chainId}-${ts}.json`);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    chainId,
    stakingContract: ethers.getAddress(stakingAddr),
    logScan: { fromBlock, toBlock: latest },
    global: {
      stakesCounter,
      totalStaked,
      totalStakedRWA,
      totalDynamicRewardsPaid,
    },
    processedStakeIdsFromRewardsEvents: [...processedStakeIds].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1)),
    maturedStRwaBurnedFlags: maturedBurns,
    note: [
      "bundles[].rInfo.rwaPending 已按 DB 审计扣减 RWA 路径多付（若有 DB 且未 SKIP_DB_OVERPAY）；uInfo 未改。",
      "migrationImportUserBundle 当前不写入 processedStakes / matured*；新部署后需另行设计防重放或补充合约。",
      "globalDelta* 每用户取链上 users.totalStaked / rwaStakes.totalStakedRWA；导入时总和应与 global 对齐，必要时用 migrationSetGlobalTotals 校准。",
    ],
    bundleCount: bundles.length,
    bundles,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[export] 已写入: ${outFile}（bundles=${bundles.length}）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
