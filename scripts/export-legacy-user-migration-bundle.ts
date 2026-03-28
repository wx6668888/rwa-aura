/**
 * 从「老」StakingContract 只读导出 migrationImportUserBundle 所需参数（单用户）
 *
 * 用法:
 *   cd 项目根目录
 *   LEGACY_STAKING=0x... USER=0x... BSC_RPC_URL=https://... npx ts-node scripts/export-legacy-user-migration-bundle.ts
 *
 * 输出: stdout JSON（含 globalDelta 建议值与合约调用 tuple 说明）
 */
import { ethers } from 'ethers';

const LEGACY = (process.env.LEGACY_STAKING || process.env.STAKING_CONTRACT_ADDRESS || '').trim();
const USER = (process.env.USER || process.env.MIGRATION_USER || '').trim();
const RPC = process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';

const ABI = [
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
];

type UsdtLock = {
  stakeId: string;
  totalAmount: string;
  principalAmount: string;
  lockStartTime: string;
  lockEndTime: string;
  isWithdrawn: boolean;
  lockPeriod: string;
};

type RwaLock = UsdtLock;

async function main() {
  if (!LEGACY || !ethers.isAddress(LEGACY)) throw new Error('Set LEGACY_STAKING to legacy staking address');
  if (!USER || !ethers.isAddress(USER)) throw new Error('Set USER to user address');

  const provider = new ethers.JsonRpcProvider(RPC);
  const c = new ethers.Contract(LEGACY, ABI, provider);
  const u = ethers.getAddress(USER);

  const us = await c.users(u);
  const userInfo = {
    totalStaked: us.totalStaked.toString(),
    rwaPending: us.rwaPending.toString(),
    usdtRewards: us.usdtRewards.toString(),
    lastWithdrawTime: us.lastWithdrawTime.toString(),
    referrer: us.referrer,
    firstStakeTime: us.firstStakeTime.toString(),
    nodeLevel: Number(us.nodeLevel),
    isActive: us.isActive,
  };

  const rs = await c.rwaStakes(u);
  const rwaInfo = {
    totalStakedRWA: rs.totalStakedRWA.toString(),
    rwaPending: rs.rwaPending.toString(),
    lastWithdrawTime: rs.lastWithdrawTime.toString(),
    referrer: rs.referrer,
    firstStakeTime: rs.firstStakeTime.toString(),
    nodeLevel: Number(rs.nodeLevel),
    isActive: rs.isActive,
  };

  const usdtFlexP = (await c.usdtFlexiblePrincipal(u)).toString();
  const usdtFlexT = (await c.usdtFlexibleTotalStaked(u)).toString();
  const rwaFlexP = (await c.rwaFlexiblePrincipal(u)).toString();
  const rwaFlexT = (await c.rwaFlexibleTotalStaked(u)).toString();

  const usdtLen = (await c.getUSDTLockedPrincipals(u)).stakeIds.length;
  const usdtLocks: UsdtLock[] = [];
  for (let i = 0; i < usdtLen; i++) {
    const t = await c.usdtLockedPrincipals(u, i);
    usdtLocks.push({
      stakeId: t.stakeId.toString(),
      totalAmount: t.totalAmount.toString(),
      principalAmount: t.principalAmount.toString(),
      lockStartTime: t.lockStartTime.toString(),
      lockEndTime: t.lockEndTime.toString(),
      isWithdrawn: t.isWithdrawn,
      lockPeriod: t.lockPeriod.toString(),
    });
  }

  const rwaLen = (await c.getRWALockedPrincipals(u)).stakeIds.length;
  const rwaLocks: RwaLock[] = [];
  for (let i = 0; i < rwaLen; i++) {
    const t = await c.rwaLockedPrincipals(u, i);
    rwaLocks.push({
      stakeId: t.stakeId.toString(),
      totalAmount: t.totalAmount.toString(),
      principalAmount: t.principalAmount.toString(),
      lockStartTime: t.lockStartTime.toString(),
      lockEndTime: t.lockEndTime.toString(),
      isWithdrawn: t.isWithdrawn,
      lockPeriod: t.lockPeriod.toString(),
    });
  }

  const hist: Array<{ amount: string; timestamp: string }> = [];
  for (let i = 0; i < 4096; i++) {
    try {
      const row = await c.stakeHistory(u, i);
      hist.push({ amount: row.amount.toString(), timestamp: row.timestamp.toString() });
    } catch {
      break;
    }
  }

  const counter = (await c.stakesCounter()).toString();

  const globalDeltaTotalStaked = userInfo.totalStaked;
  const globalDeltaTotalStakedRWA = rwaInfo.totalStakedRWA;

  const out = {
    meta: {
      legacyStaking: LEGACY,
      user: u,
      rpc: RPC,
      legacyStakesCounter: counter,
      note: 'globalDeltaTotalStaked 默认 = users.totalStaked；若老合约存在把 RWA 计入 totalStaked 的特殊路径，请人工核对链上 totalStaked 分解后再改 JSON。',
    },
    migrationImportUserBundleArgs: {
      user: u,
      uInfo: [
        userInfo.totalStaked,
        userInfo.rwaPending,
        userInfo.usdtRewards,
        userInfo.lastWithdrawTime,
        userInfo.referrer,
        userInfo.firstStakeTime,
        userInfo.nodeLevel,
        userInfo.isActive,
      ],
      rInfo: [
        rwaInfo.totalStakedRWA,
        rwaInfo.rwaPending,
        rwaInfo.lastWithdrawTime,
        rwaInfo.referrer,
        rwaInfo.firstStakeTime,
        rwaInfo.nodeLevel,
        rwaInfo.isActive,
      ],
      usdtLocks: usdtLocks.map((x) => [
        x.stakeId,
        x.totalAmount,
        x.principalAmount,
        x.lockStartTime,
        x.lockEndTime,
        x.isWithdrawn,
        x.lockPeriod,
      ]),
      rwaLocks: rwaLocks.map((x) => [
        x.stakeId,
        x.totalAmount,
        x.principalAmount,
        x.lockStartTime,
        x.lockEndTime,
        x.isWithdrawn,
        x.lockPeriod,
      ]),
      usdtFlexPrincipal_: usdtFlexP,
      usdtFlexTotal_: usdtFlexT,
      rwaFlexPrincipal_: rwaFlexP,
      rwaFlexTotal_: rwaFlexT,
      hist: hist.map((h) => [h.amount, h.timestamp]),
      globalDeltaTotalStaked,
      globalDeltaTotalStakedRWA,
    },
    readable: { userInfo, rwaInfo, usdtLocks, rwaLocks, usdtFlexPrincipal: usdtFlexP, usdtFlexTotal: usdtFlexT, rwaFlexPrincipal: rwaFlexP, rwaFlexTotal: rwaFlexT, stakeHistory: hist },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
