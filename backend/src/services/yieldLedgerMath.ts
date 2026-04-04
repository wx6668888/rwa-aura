import BigNumber from 'bignumber.js';

/** 与 balance_snapshots / PreciseYieldCalculator 一致的快照行（可来自库表或 stake_events 合成） */
export interface LedgerSnapshotRow {
  timestamp: number;
  balance_type: string;
  amount: string;
  lock_end_time: number | null;
  event_type: string;
  tx_hash: string;
}

interface BalanceState {
  flexible: BigNumber;
  locked_30: BigNumber;
  locked_90: BigNumber;
  locked_180: BigNumber;
  locked_365: BigNumber;
}

const BASE_YIELD_RATE = 0.008;
const LOCK_BONUS: Record<number, number> = { 0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5 };

function getYieldRate(lockPeriod: number): number {
  const bonus = LOCK_BONUS[lockPeriod as keyof typeof LOCK_BONUS] || 0;
  return BASE_YIELD_RATE * (1 + bonus);
}

function deepCopyBalance(balance: BalanceState): BalanceState {
  return {
    flexible: new BigNumber(balance.flexible),
    locked_30: new BigNumber(balance.locked_30),
    locked_90: new BigNumber(balance.locked_90),
    locked_180: new BigNumber(balance.locked_180),
    locked_365: new BigNumber(balance.locked_365),
  };
}

function updateBalance(balance: BalanceState, snapshot: LedgerSnapshotRow): void {
  const amount = new BigNumber(snapshot.amount);
  const type = snapshot.balance_type as keyof BalanceState;
  if (balance[type] !== undefined) {
    balance[type] = balance[type].plus(amount);
  }
}

function calculateBalanceFromSnapshots(snapshots: LedgerSnapshotRow[]): BalanceState {
  const balance: BalanceState = {
    flexible: new BigNumber(0),
    locked_30: new BigNumber(0),
    locked_90: new BigNumber(0),
    locked_180: new BigNumber(0),
    locked_365: new BigNumber(0),
  };
  for (const snapshot of snapshots) {
    updateBalance(balance, snapshot);
  }
  return balance;
}

function calculateSegmentYield(
  balance: BalanceState,
  fromTime: number,
  toTime: number,
  assetType: 'USDT' | 'RWA'
): { yield: string; from: number; to: number; duration: number; balances: Record<string, unknown> } {
  const duration = toTime - fromTime;
  let totalYield = new BigNumber(0);
  const balanceDetails: Record<string, unknown> = {};

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
    balanceDetails[type] = {
      balance: amount.toFixed(0),
      yield_rate: yieldRate,
      yield: yieldAmount.toFixed(0),
    };
  }

  return {
    from: fromTime,
    to: toTime,
    duration,
    balances: balanceDetails,
    yield: totalYield.toFixed(0),
  };
}

/**
 * 与 audit / dedupe-balance-snapshots 相同：有 tx 则按 (tx, event_type, balance_type) 只保留首条。
 */
export function dedupeLedgerSnapshotsForYield(rows: LedgerSnapshotRow[]): LedgerSnapshotRow[] {
  const seen = new Set<string>();
  const out: LedgerSnapshotRow[] = [];
  for (const r of rows) {
    const th = (r.tx_hash ?? '').trim();
    const key = th
      ? `tx|${th}|${r.event_type}|${r.balance_type}`
      : `no|${r.timestamp}|${r.amount}|${r.balance_type}|${r.event_type}|${r.lock_end_time ?? 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * 按 balance_snapshots 口径的分段积分：在 [fromTime, toTime] 上根据快照序列计算应得收益（与旧 PreciseYieldCalculator 一致）。
 */
export function computeYieldFromLedgerSnapshots(
  snapshotsSorted: LedgerSnapshotRow[],
  assetType: 'USDT' | 'RWA',
  fromTime: number,
  toTime: number
): { totalYield: string; details: unknown[] } {
  if (snapshotsSorted.length === 0) {
    return { totalYield: '0', details: [] };
  }

  const snapshotsBeforeFrom = snapshotsSorted.filter((s) => s.timestamp < fromTime);
  const initialBalance = calculateBalanceFromSnapshots(snapshotsBeforeFrom);

  const snapshots = snapshotsSorted.filter((s) => s.timestamp >= fromTime && s.timestamp <= toTime);

  const details: unknown[] = [];
  let totalYield = new BigNumber(0);
  let currentBalance = deepCopyBalance(initialBalance);
  let lastTime = fromTime;

  for (const snapshot of snapshots) {
    if (snapshot.timestamp > lastTime) {
      const segmentYield = calculateSegmentYield(currentBalance, lastTime, snapshot.timestamp, assetType);
      totalYield = totalYield.plus(new BigNumber(segmentYield.yield));
      details.push(segmentYield);
    }
    updateBalance(currentBalance, snapshot);
    lastTime = snapshot.timestamp;
  }

  if (lastTime < toTime) {
    const finalYield = calculateSegmentYield(currentBalance, lastTime, toTime, assetType);
    totalYield = totalYield.plus(new BigNumber(finalYield.yield));
    details.push(finalYield);
  }

  return { totalYield: totalYield.toFixed(0), details };
}
