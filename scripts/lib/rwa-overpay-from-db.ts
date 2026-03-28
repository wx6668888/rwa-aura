/**
 * 从 DB 计算「重复 balance_snapshots 导致 RWA 资产日结多算」的每地址多付 wei（与 backend/scripts/audit-overpaid-yield-dup-snapshots.ts 一致）
 */
import mysql from 'mysql2/promise';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

const BASE_YIELD_RATE = 0.008;
const LOCK_BONUS: Record<number, number> = { 0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5 };

export interface Snap {
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

function updateBalance(balance: BalanceState, snapshot: Snap): void {
  const amount = new BigNumber(snapshot.amount);
  const type = snapshot.balance_type as keyof BalanceState;
  if (balance[type] !== undefined) {
    balance[type] = balance[type].plus(amount);
  }
}

function calculateSegmentYield(
  balance: BalanceState,
  fromTime: number,
  toTime: number,
  assetType: 'USDT' | 'RWA'
): BigNumber {
  const duration = toTime - fromTime;
  let totalYield = new BigNumber(0);
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
  }
  return totalYield;
}

function calculateYieldFromSnapshots(
  snapshots: Snap[],
  assetType: 'USDT' | 'RWA',
  fromTime: number,
  toTime: number
): bigint {
  const all = snapshots.filter((s) => s.timestamp <= toTime);
  if (all.length === 0) return 0n;

  const beforeFrom = all.filter((s) => s.timestamp < fromTime);
  let currentBalance = emptyBalance();
  for (const s of beforeFrom) updateBalance(currentBalance, s);

  const windowSnaps = all.filter((s) => s.timestamp >= fromTime && s.timestamp <= toTime);
  let totalYield = new BigNumber(0);
  let lastTime = fromTime;

  for (const snapshot of windowSnaps) {
    if (snapshot.timestamp > lastTime) {
      totalYield = totalYield.plus(
        calculateSegmentYield(currentBalance, lastTime, snapshot.timestamp, assetType)
      );
    }
    updateBalance(currentBalance, snapshot);
    lastTime = snapshot.timestamp;
  }

  if (lastTime < toTime) {
    totalYield = totalYield.plus(calculateSegmentYield(currentBalance, lastTime, toTime, assetType));
  }

  try {
    return BigInt(totalYield.toFixed(0));
  } catch {
    return 0n;
  }
}

function dedupeSnapshots(rows: Snap[]): Snap[] {
  const seen = new Set<string>();
  const out: Snap[] = [];
  for (const r of rows) {
    const th = (r.tx_hash || '').trim();
    const key = th
      ? `tx|${th}|${r.event_type}|${r.balance_type}`
      : `no|${r.timestamp}|${r.amount}|${r.balance_type}|${r.event_type}|${r.lock_end_time ?? 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

const MATCH_WEI_TOLERANCE = 10n ** 12n;

/**
 * @returns address(lower) -> overpay wei (RWA path settlements only, matched rows)
 */
export async function computeRwaOverpayWeiByAddress(
  conn: mysql.Connection
): Promise<Map<string, bigint>> {
  const overpay = new Map<string, bigint>();

  const [dupPairs] = await conn.query<Array<{ addr: string; asset_type: string }>>(
    `SELECT DISTINCT LOWER(b1.user_address) AS addr, b1.asset_type
     FROM balance_snapshots b1
     INNER JOIN balance_snapshots b2
       ON LOWER(b1.user_address) = LOWER(b2.user_address)
      AND b1.asset_type = b2.asset_type
      AND b1.tx_hash = b2.tx_hash
      AND b1.balance_type = b2.balance_type
      AND b1.event_type = b2.event_type
      AND b1.tx_hash IS NOT NULL
      AND TRIM(b1.tx_hash) != ''
      AND b1.id < b2.id`
  );

  for (const { addr, asset_type } of dupPairs) {
    if (asset_type !== 'RWA') continue;

    const [settlements] = await conn.query<
      Array<{ from_time: number; to_time: number; total_yield: string }>
    >(
      `SELECT from_time, to_time, total_yield
       FROM yield_settlements
       WHERE LOWER(user_address) = ? AND asset_type = 'RWA'
       ORDER BY settlement_time ASC`,
      [addr]
    );

    let sum = 0n;
    for (const row of settlements) {
      const [snapRows] = await conn.query<
        Array<{
          timestamp: number;
          balance_type: string;
          amount: string;
          lock_end_time: number | null;
          event_type: string;
          tx_hash: string | null;
        }>
      >(
        `SELECT timestamp, balance_type, amount, lock_end_time, event_type, IFNULL(tx_hash,'') AS tx_hash
         FROM balance_snapshots
         WHERE LOWER(user_address) = ? AND asset_type = 'RWA' AND timestamp <= ?
         ORDER BY timestamp ASC, id ASC`,
        [addr, row.to_time]
      );

      const snaps: Snap[] = snapRows.map((r) => ({
        timestamp: Number(r.timestamp),
        balance_type: r.balance_type,
        amount: String(r.amount),
        lock_end_time: r.lock_end_time != null ? Number(r.lock_end_time) : null,
        event_type: r.event_type,
        tx_hash: String(r.tx_hash || ''),
      }));

      const rawWei = calculateYieldFromSnapshots(snaps, 'RWA', row.from_time, row.to_time);
      const dedupWei = calculateYieldFromSnapshots(dedupeSnapshots(snaps), 'RWA', row.from_time, row.to_time);

      let storedWei: bigint;
      try {
        storedWei = ethers.parseEther(String(row.total_yield).trim());
      } catch {
        continue;
      }

      const diffRawStored = rawWei > storedWei ? rawWei - storedWei : storedWei - rawWei;
      if (diffRawStored > MATCH_WEI_TOLERANCE) continue;

      const excess = rawWei - dedupWei;
      if (excess > 0n) sum += excess;
    }

    if (sum > 0n) overpay.set(addr, sum);
  }

  return overpay;
}
