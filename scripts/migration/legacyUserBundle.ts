/**
 * 从老 StakingContract 只读组装 migrationImportUserBundle 参数（纯 ethers，不依赖 Hardhat）
 */
import { ethers } from 'ethers';

const READ_ABI = [
  'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function usdtFlexiblePrincipal(address) view returns (uint256)',
  'function usdtFlexibleTotalStaked(address) view returns (uint256)',
  'function rwaFlexiblePrincipal(address) view returns (uint256)',
  'function rwaFlexibleTotalStaked(address) view returns (uint256)',
  'function usdtLockedPrincipals(address,uint256) view returns (uint256 stakeId, uint256 totalAmount, uint256 principalAmount, uint256 lockStartTime, uint256 lockEndTime, bool isWithdrawn, uint256 lockPeriod)',
  'function rwaLockedPrincipals(address,uint256) view returns (uint256 stakeId, uint256 totalAmount, uint256 principalAmount, uint256 lockStartTime, uint256 lockEndTime, bool isWithdrawn, uint256 lockPeriod)',
  'function stakeHistory(address,uint256) view returns (uint256 amount, uint256 timestamp)',
  'function getUSDTLockedPrincipals(address) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function getRWALockedPrincipals(address) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function stakesCounter() view returns (uint256)',
] as const;

export type MigrationBundleArgs = {
  user: string;
  uInfo: [bigint, bigint, bigint, bigint, string, bigint, number, boolean];
  rInfo: [bigint, bigint, bigint, string, bigint, number, boolean];
  usdtLocks: [bigint, bigint, bigint, bigint, bigint, boolean, bigint][];
  rwaLocks: [bigint, bigint, bigint, bigint, bigint, boolean, bigint][];
  usdtFlexPrincipal_: bigint;
  usdtFlexTotal_: bigint;
  rwaFlexPrincipal_: bigint;
  rwaFlexTotal_: bigint;
  hist: [bigint, bigint][];
  globalDeltaTotalStaked: bigint;
  globalDeltaTotalStakedRWA: bigint;
};

export async function fetchLegacyUserBundle(
  provider: ethers.Provider,
  legacyStaking: string,
  user: string
): Promise<{ args: MigrationBundleArgs; legacyStakesCounter: bigint; readable: Record<string, unknown> }> {
  const c = new ethers.Contract(ethers.getAddress(legacyStaking), READ_ABI, provider);
  const u = ethers.getAddress(user);

  const us = await c.users(u);
  const uInfo: MigrationBundleArgs['uInfo'] = [
    us.totalStaked,
    us.rwaPending,
    us.usdtRewards,
    us.lastWithdrawTime,
    us.referrer,
    us.firstStakeTime,
    Number(us.nodeLevel),
    us.isActive,
  ];

  const rs = await c.rwaStakes(u);
  const rInfo: MigrationBundleArgs['rInfo'] = [
    rs.totalStakedRWA,
    rs.rwaPending,
    rs.lastWithdrawTime,
    rs.referrer,
    rs.firstStakeTime,
    Number(rs.nodeLevel),
    rs.isActive,
  ];

  const usdtFlexPrincipal_ = await c.usdtFlexiblePrincipal(u);
  const usdtFlexTotal_ = await c.usdtFlexibleTotalStaked(u);
  const rwaFlexPrincipal_ = await c.rwaFlexiblePrincipal(u);
  const rwaFlexTotal_ = await c.rwaFlexibleTotalStaked(u);

  const usdtLen = Number((await c.getUSDTLockedPrincipals(u)).stakeIds.length);
  const usdtLocks: MigrationBundleArgs['usdtLocks'] = [];
  for (let i = 0; i < usdtLen; i++) {
    const t = await c.usdtLockedPrincipals(u, i);
    usdtLocks.push([
      t.stakeId,
      t.totalAmount,
      t.principalAmount,
      t.lockStartTime,
      t.lockEndTime,
      t.isWithdrawn,
      t.lockPeriod,
    ]);
  }

  const rwaLen = Number((await c.getRWALockedPrincipals(u)).stakeIds.length);
  const rwaLocks: MigrationBundleArgs['rwaLocks'] = [];
  for (let i = 0; i < rwaLen; i++) {
    const t = await c.rwaLockedPrincipals(u, i);
    rwaLocks.push([
      t.stakeId,
      t.totalAmount,
      t.principalAmount,
      t.lockStartTime,
      t.lockEndTime,
      t.isWithdrawn,
      t.lockPeriod,
    ]);
  }

  const hist: [bigint, bigint][] = [];
  const maxHist = parseInt(process.env.MIGRATION_MAX_STAKE_HISTORY || '4096', 10);
  for (let i = 0; i < maxHist; i++) {
    try {
      const row = await c.stakeHistory(u, i);
      hist.push([row.amount, row.timestamp]);
    } catch {
      break;
    }
  }

  let legacyStakesCounter = 0n;
  try {
    legacyStakesCounter = await c.stakesCounter();
  } catch {
    // 部分已部署版本无 public stakesCounter getter（eth_call 会 revert），由 02 汇总链上 stakeId 后写 migration-min-stakes-counter.txt
    legacyStakesCounter = 0n;
  }

  const args: MigrationBundleArgs = {
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
    globalDeltaTotalStaked: uInfo[0],
    globalDeltaTotalStakedRWA: rInfo[0],
  };

  const readable = {
    userInfo: {
      totalStaked: uInfo[0].toString(),
      rwaPending: uInfo[1].toString(),
      usdtRewards: uInfo[2].toString(),
      lastWithdrawTime: uInfo[3].toString(),
      referrer: uInfo[4],
      firstStakeTime: uInfo[5].toString(),
      nodeLevel: uInfo[6],
      isActive: uInfo[7],
    },
    rwaInfo: {
      totalStakedRWA: rInfo[0].toString(),
      rwaPending: rInfo[1].toString(),
      lastWithdrawTime: rInfo[2].toString(),
      referrer: rInfo[3],
      firstStakeTime: rInfo[4].toString(),
      nodeLevel: rInfo[5],
      isActive: rInfo[6],
    },
    usdtLocksCount: usdtLocks.length,
    rwaLocksCount: rwaLocks.length,
    stakeHistoryCount: hist.length,
  };

  return { args, legacyStakesCounter, readable };
}

/** JSON 序列化（bigint → string） */
export function bundleToJson(
  legacyStaking: string,
  args: MigrationBundleArgs,
  legacyStakesCounter: bigint,
  readable: Record<string, unknown>
) {
  const ser = (n: bigint) => n.toString();
  const serLock = (x: [bigint, bigint, bigint, bigint, bigint, boolean, bigint]) => ({
    stakeId: ser(x[0]),
    totalAmount: ser(x[1]),
    principalAmount: ser(x[2]),
    lockStartTime: ser(x[3]),
    lockEndTime: ser(x[4]),
    isWithdrawn: x[5],
    lockPeriod: ser(x[6]),
  });
  return {
    meta: { legacyStaking, user: args.user, legacyStakesCounter: legacyStakesCounter.toString() },
    readable,
    migrationImportUserBundleArgs: {
      user: args.user,
      uInfo: [
        ser(args.uInfo[0]),
        ser(args.uInfo[1]),
        ser(args.uInfo[2]),
        ser(args.uInfo[3]),
        args.uInfo[4],
        ser(args.uInfo[5]),
        args.uInfo[6],
        args.uInfo[7],
      ],
      rInfo: [
        ser(args.rInfo[0]),
        ser(args.rInfo[1]),
        ser(args.rInfo[2]),
        args.rInfo[3],
        ser(args.rInfo[4]),
        args.rInfo[5],
        args.rInfo[6],
      ],
      usdtLocks: args.usdtLocks.map(serLock),
      rwaLocks: args.rwaLocks.map(serLock),
      usdtFlexPrincipal_: ser(args.usdtFlexPrincipal_),
      usdtFlexTotal_: ser(args.usdtFlexTotal_),
      rwaFlexPrincipal_: ser(args.rwaFlexPrincipal_),
      rwaFlexTotal_: ser(args.rwaFlexTotal_),
      hist: args.hist.map(([a, t]) => [ser(a), ser(t)]),
      globalDeltaTotalStaked: ser(args.globalDeltaTotalStaked),
      globalDeltaTotalStakedRWA: ser(args.globalDeltaTotalStakedRWA),
    },
  };
}

export function parseBundleFromJson(j: {
  migrationImportUserBundleArgs: {
    user: string;
    uInfo: (string | number | boolean)[];
    rInfo: (string | number | boolean)[];
    usdtLocks: Array<Record<string, string | boolean>>;
    rwaLocks: Array<Record<string, string | boolean>>;
    usdtFlexPrincipal_: string;
    usdtFlexTotal_: string;
    rwaFlexPrincipal_: string;
    rwaFlexTotal_: string;
    hist: [string, string][];
    globalDeltaTotalStaked: string;
    globalDeltaTotalStakedRWA: string;
  };
}): MigrationBundleArgs {
  const a = j.migrationImportUserBundleArgs;
  const B = (s: string) => BigInt(s);
  const uInfo = a.uInfo as [string, string, string, string, string, string, number, boolean];
  const rInfo = a.rInfo as [string, string, string, string, string, number, boolean];
  if (uInfo.length !== 8) throw new Error('uInfo must have 8 elements');
  if (rInfo.length !== 7) throw new Error('rInfo must have 7 elements');
  const parseLock = (x: Record<string, string | boolean>): [bigint, bigint, bigint, bigint, bigint, boolean, bigint] => [
    B(x.stakeId as string),
    B(x.totalAmount as string),
    B(x.principalAmount as string),
    B(x.lockStartTime as string),
    B(x.lockEndTime as string),
    x.isWithdrawn as boolean,
    B(x.lockPeriod as string),
  ];
  return {
    user: ethers.getAddress(a.user),
    uInfo: [
      B(uInfo[0]),
      B(uInfo[1]),
      B(uInfo[2]),
      B(uInfo[3]),
      ethers.getAddress(uInfo[4]),
      B(uInfo[5]),
      Number(uInfo[6]),
      uInfo[7],
    ],
    rInfo: [
      B(rInfo[0]),
      B(rInfo[1]),
      B(rInfo[2]),
      ethers.getAddress(rInfo[3]),
      B(rInfo[4]),
      Number(rInfo[5]),
      Boolean(rInfo[6]),
    ],
    usdtLocks: a.usdtLocks.map(parseLock),
    rwaLocks: a.rwaLocks.map(parseLock),
    usdtFlexPrincipal_: B(a.usdtFlexPrincipal_),
    usdtFlexTotal_: B(a.usdtFlexTotal_),
    rwaFlexPrincipal_: B(a.rwaFlexPrincipal_),
    rwaFlexTotal_: B(a.rwaFlexTotal_),
    hist: a.hist.map(([am, ts]) => [B(am), B(ts)]),
    globalDeltaTotalStaked: B(a.globalDeltaTotalStaked),
    globalDeltaTotalStakedRWA: B(a.globalDeltaTotalStakedRWA),
  };
}
