/**
 * 用质押合约 0xED24C652266674beF1514a671263b78628ec766e（或 .env STAKING_CONTRACT_ADDRESS）
 * 每笔 yield_settlements 对应交易回执中的 RewardsUpdated 事件，与库中 total_yield 比对。
 *
 * 链上 rwAmount（18 位）为当日实际入账的 RWA wei（RWA 日结路径 usdtAmount=0）；
 * USDT 路径会同时有 rwAmount 与 usdtAmount，库中 total_yield 存的是 RWA 侧 wei 的 ether 字符串（与 DailySettlementService 一致）。
 *
 * 用法：
 *   cd backend && npx ts-node --transpile-only scripts/compare-yield-settlements-vs-contract-events.ts
 *   LIMIT=500 npx ts-node --transpile-only scripts/compare-yield-settlements-vs-contract-events.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ethers } from 'ethers';

dotenv.config({ path: path.join(__dirname, '../.env') });

const STAKING =
  process.env.STAKING_CONTRACT_ADDRESS ||
  process.env.STAKING_CONTRACT ||
  '0xED24C652266674beF1514a671263b78628ec766e';

const iface = new ethers.Interface([
  'event RewardsUpdated(address indexed user, uint256 rwAmount, uint256 usdtAmount, uint256 indexed stakeId, uint256 timestamp)',
]);

function parseRewardsUpdated(log: ethers.Log): {
  user: string;
  rwAmount: bigint;
  usdtAmount: bigint;
  stakeId: bigint;
} | null {
  try {
    const parsed = iface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    if (parsed?.name !== 'RewardsUpdated') return null;
    return {
      user: String(parsed.args[0]),
      rwAmount: BigInt(parsed.args[1].toString()),
      usdtAmount: BigInt(parsed.args[2].toString()),
      stakeId: BigInt(parsed.args[3].toString()),
    };
  } catch {
    return null;
  }
}

async function main() {
  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  if (!rpcUrl) throw new Error('需要 BSC_RPC_URL');

  const limit = Math.min(
    5000,
    Math.max(1, parseInt(process.env.LIMIT || '2000', 10) || 2000)
  );

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const stakingLc = STAKING.toLowerCase();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, LOWER(TRIM(user_address)) AS user_address, asset_type, settlement_time, from_time, to_time,
            total_yield, tx_hash
     FROM yield_settlements
     WHERE tx_hash IS NOT NULL AND tx_hash != '' AND tx_hash != 'PENDING'
     ORDER BY id ASC
     LIMIT ${limit}`
  );
  await conn.end();

  const mismatches: unknown[] = [];
  let ok = 0;
  let noReceipt = 0;
  let noLog = 0;
  let compared = 0;

  const toleranceWei = 10n ** 12n; // 1e-6 RWA 量级

  for (const r of rows) {
    const txHash = String(r.tx_hash).trim();
    const rec = await provider.getTransactionReceipt(txHash);
    if (!rec) {
      noReceipt++;
      mismatches.push({ id: r.id, tx_hash: txHash, error: 'no_receipt' });
      continue;
    }

    let ev: ReturnType<typeof parseRewardsUpdated> | null = null;
    for (const log of rec.logs) {
      ev = parseRewardsUpdated(log);
      if (ev) break;
    }
    if (!ev) {
      noLog++;
      mismatches.push({ id: r.id, tx_hash: txHash, error: 'no_RewardsUpdated_log' });
      continue;
    }

    const dbYieldStr = String(r.total_yield).trim().split(/e|E/)[0];
    let dbWei: bigint;
    try {
      dbWei = ethers.parseEther(dbYieldStr);
    } catch {
      dbWei = 0n;
    }

    const diff =
      dbWei > ev.rwAmount ? dbWei - ev.rwAmount : ev.rwAmount - dbWei;
    compared++;

    if (diff <= toleranceWei) {
      ok++;
    } else {
      mismatches.push({
        id: r.id,
        user: r.user_address,
        asset_type: r.asset_type,
        settlement_time: r.settlement_time,
        tx_hash: txHash,
        db_total_yield: r.total_yield,
        db_rw_wei: dbWei.toString(),
        chain_rw_wei: ev.rwAmount.toString(),
        chain_usdt_wei: ev.usdtAmount.toString(),
        stakeId: ev.stakeId.toString(),
        diff_wei: diff.toString(),
        diff_rwa: ethers.formatEther(diff),
      });
    }
  }

  const report = {
    staking_contract: STAKING,
    rows_fetched: rows.length,
    compared_with_event: compared,
    match_within_tolerance: ok,
    mismatch_or_parse_issue: mismatches.length,
    no_receipt: noReceipt,
    no_rewards_log: noLog,
    tolerance_wei: toleranceWei.toString(),
    mismatches_sample_first_50: mismatches.slice(0, 50),
    note:
      '链上 RewardsUpdated.rwAmount 为实际入账；若与库不一致，以链为准。USDT 路径请同时看 usdtAmount。',
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
