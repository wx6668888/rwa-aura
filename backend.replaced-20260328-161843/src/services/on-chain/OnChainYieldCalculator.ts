import { Contract, type Provider } from 'ethers';
import BigNumber from 'bignumber.js';
import { findBlockAtOrBefore } from './chainSettlementUtils';

/** 与 PreciseYieldCalculator 一致的日收益率与锁仓加成 */
const BASE_YIELD_RATE = 0.008;
const LOCK_BONUS: Record<number, number> = { 0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5 };

interface BalanceState {
  flexible: BigNumber;
  locked_30: BigNumber;
  locked_90: BigNumber;
  locked_180: BigNumber;
  locked_365: BigNumber;
}

const STAKING_READ_ABI = [
  'function rwaFlexibleTotalStaked(address user) view returns (uint256)',
  'function usdtFlexibleTotalStaked(address user) view returns (uint256)',
  'function getRWALockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function getUSDTLockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function rwaStakes(address user) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function users(address user) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
] as const;

/** 用锁仓起止时间推算天数（不依赖 stakeLockPeriods，兼容未写入该 mapping 的质押路径） */
function inferLockDays(lockStart: bigint, lockEnd: bigint): number {
  const sec = Number(lockEnd - lockStart);
  if (sec <= 0) return 0;
  return Math.round(sec / 86400);
}

function addToLockBucket(b: BalanceState, lockDays: number, fullStakeWei: BigNumber): void {
  if (lockDays === 30) b.locked_30 = b.locked_30.plus(fullStakeWei);
  else if (lockDays === 90) b.locked_90 = b.locked_90.plus(fullStakeWei);
  else if (lockDays === 180) b.locked_180 = b.locked_180.plus(fullStakeWei);
  else if (lockDays === 365) b.locked_365 = b.locked_365.plus(fullStakeWei);
  else b.flexible = b.flexible.plus(fullStakeWei);
}

function emptyBalance(): BalanceState {
  return {
    flexible: new BigNumber(0),
    locked_30: new BigNumber(0),
    locked_90: new BigNumber(0),
    locked_180: new BigNumber(0),
    locked_365: new BigNumber(0),
  };
}

function getYieldRate(lockPeriod: number): number {
  const bonus = LOCK_BONUS[lockPeriod] ?? 0;
  return BASE_YIELD_RATE * (1 + bonus);
}

/**
 * 合约 50/50 进国库后，getRWALockedPrincipals / getUSDTLockedPrincipals 返回的是 principalAmount。
 * 与库表 stake_events 中「全额质押」口径对齐时，用 principal*2 近似全额（与 50/50 一致）。
 */
function principalToFullStakeWei(principal: bigint): BigNumber {
  return new BigNumber((principal * 2n).toString());
}

/**
 * 在给定区块上读取链上仓位，按与 PreciseYieldCalculator 相同公式计算 [fromTime, toTime] 区间收益（秒级时长）。
 * 说明：无法在链上免费重放区间内每笔加减，此处采用「窗口起点区块」上的仓位近似整日计息；与快照积分模型略有差异。
 */
export class OnChainYieldCalculator {
  private contract: Contract;

  constructor(provider: Provider, stakingContractAddress: string) {
    this.contract = new Contract(stakingContractAddress, STAKING_READ_ABI, provider);
  }

  private async buildRwaBucketsAt(user: string, blockTag: number): Promise<BalanceState> {
    const b = emptyBalance();
    const flex: bigint = await this.contract.rwaFlexibleTotalStaked(user, { blockTag });
    b.flexible = b.flexible.plus(new BigNumber(flex.toString()));

    const res = await this.contract.getRWALockedPrincipals(user, { blockTag });
    const amounts: bigint[] = res[1];
    const lockStartTimes: bigint[] = res[2];
    const lockEndTimes: bigint[] = res[3];
    const isWithdrawn: boolean[] = res[5];

    for (let i = 0; i < amounts.length; i++) {
      if (isWithdrawn[i]) continue;
      const full = principalToFullStakeWei(amounts[i]);
      const days = inferLockDays(lockStartTimes[i], lockEndTimes[i]);
      addToLockBucket(b, days, full);
    }
    return b;
  }

  private async buildUsdtBucketsAt(user: string, blockTag: number): Promise<BalanceState> {
    const b = emptyBalance();
    const flex: bigint = await this.contract.usdtFlexibleTotalStaked(user, { blockTag });
    b.flexible = b.flexible.plus(new BigNumber(flex.toString()));

    const res = await this.contract.getUSDTLockedPrincipals(user, { blockTag });
    const amounts: bigint[] = res[1];
    const lockStartTimes: bigint[] = res[2];
    const lockEndTimes: bigint[] = res[3];
    const isWithdrawn: boolean[] = res[5];

    for (let i = 0; i < amounts.length; i++) {
      if (isWithdrawn[i]) continue;
      const full = principalToFullStakeWei(amounts[i]);
      const days = inferLockDays(lockStartTimes[i], lockEndTimes[i]);
      addToLockBucket(b, days, full);
    }
    return b;
  }

  async hadRwaPositionAt(user: string, blockTag: number): Promise<boolean> {
    const r = await this.contract.rwaStakes(user, { blockTag });
    const totalStakedRWA: bigint = r[0];
    return totalStakedRWA > 0n;
  }

  async hadUsdtPositionAt(user: string, blockTag: number): Promise<boolean> {
    const u = await this.contract.users(user, { blockTag });
    const totalStaked: bigint = u[0];
    return totalStaked > 0n;
  }

  async calculateYield(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    fromTime: number,
    toTime: number,
    provider: Provider,
    /** 同一结算批次内可传入已算好的起点区块，减少 RPC */
    blockTagOverride?: number
  ): Promise<{ totalYield: string; details: unknown[] }> {
    const blockTag = blockTagOverride ?? (await findBlockAtOrBefore(provider, fromTime));
    const duration = toTime - fromTime;
    if (duration <= 0) {
      return { totalYield: '0', details: [] };
    }

    const balance =
      assetType === 'RWA'
        ? await this.buildRwaBucketsAt(userAddress, blockTag)
        : await this.buildUsdtBucketsAt(userAddress, blockTag);

    let totalYield = new BigNumber(0);
    const details: unknown[] = [];

    for (const [type, amount] of Object.entries(balance)) {
      if (amount.isZero() || amount.isNegative()) continue;
      const lockPeriod = type === 'flexible' ? 0 : parseInt(type.replace('locked_', ''), 10);
      const yieldRate = getYieldRate(lockPeriod);

      let yieldAmount: BigNumber;
      if (assetType === 'USDT') {
        const rwaEquivalent = amount.dividedBy(0.85);
        yieldAmount = rwaEquivalent.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
      } else {
        yieldAmount = amount.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
      }

      totalYield = totalYield.plus(yieldAmount);
      details.push({
        source: 'on_chain',
        blockTag,
        bucket: type,
        balance_wei: amount.toFixed(0),
        yield_rate: yieldRate,
        duration,
        yield: yieldAmount.toFixed(0),
      });
    }

    return { totalYield: totalYield.toFixed(0), details };
  }
}
