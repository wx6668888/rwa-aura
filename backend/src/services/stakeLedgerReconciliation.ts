import type { Connection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ethers } from 'ethers';
import {
  computeYieldFromLedgerSnapshots,
  dedupeLedgerSnapshotsForYield,
  type LedgerSnapshotRow,
} from './yieldLedgerMath';

export type StakeLedgerAsset = 'USDT' | 'RWA';

export function toLedgerRowFromStake(r: RowDataPacket): LedgerSnapshotRow & { _ord: number } {
  const lock = Number(r.lock_period) || 0;
  const ts = Number(r.timestamp);
  const balanceType = lock === 0 ? 'flexible' : `locked_${lock}`;
  const lockEnd = lock > 0 ? ts + lock * 86400 : null;
  return {
    timestamp: ts,
    balance_type: balanceType,
    amount: String(r.amount).trim(),
    lock_end_time: lockEnd,
    event_type: 'stake',
    tx_hash: String(r.tx_hash || '').trim(),
    _ord: Number(r.id) || 0,
  };
}

export function toLedgerRowFromBalanceSnapshot(r: RowDataPacket): LedgerSnapshotRow & { _ord: number } {
  return {
    timestamp: Number(r.timestamp),
    balance_type: String(r.balance_type),
    amount: String(r.amount).trim(),
    lock_end_time: r.lock_end_time != null ? Number(r.lock_end_time) : null,
    event_type: String(r.event_type),
    tx_hash: String(r.tx_hash || '').trim(),
    _ord: Number(r.id) || 0,
  };
}

export function parseTotalYieldWei(paidStr: string): bigint {
  const s = paidStr.trim();
  try {
    return ethers.parseEther(s.split(/e|E/)[0] || s);
  } catch {
    return 0n;
  }
}

/**
 * 从 stake_events + balance_snapshots(withdraw/mature) 构建去重后的账本快照序列。
 */
export function mergeAndDedupeLedgerSnapshots(
  stakes: RowDataPacket[],
  outs: RowDataPacket[]
): LedgerSnapshotRow[] {
  const merged: Array<LedgerSnapshotRow & { _ord: number }> = [
    ...stakes.map(toLedgerRowFromStake),
    ...outs.map(toLedgerRowFromBalanceSnapshot),
  ];
  merged.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a._ord - b._ord;
  });
  const stripped = merged.map(({ _ord, ...rest }) => rest);
  return dedupeLedgerSnapshotsForYield(stripped);
}

export interface SettlementRowInput {
  from_time: number;
  to_time: number;
  total_yield: string;
}

/**
 * 对 yield_settlements 各窗口按质押账本分段积分求和，并与已付 total_yield 对比。
 */
export function sumPaidVsLedgerForWindows(
  ledgerSnapshots: LedgerSnapshotRow[],
  assetType: StakeLedgerAsset,
  settlements: SettlementRowInput[]
): { sumPaidWei: bigint; sumExpectedLedgerWei: bigint } {
  let sumPaidWei = 0n;
  let sumExpectedLedgerWei = 0n;
  for (const row of settlements) {
    const fromTime = Number(row.from_time);
    const toTime = Number(row.to_time);
    const paidWei = parseTotalYieldWei(String(row.total_yield));
    const { totalYield } = computeYieldFromLedgerSnapshots(ledgerSnapshots, assetType, fromTime, toTime);
    sumPaidWei += paidWei;
    sumExpectedLedgerWei += BigInt(totalYield);
  }
  return { sumPaidWei, sumExpectedLedgerWei };
}

export interface SettlementDetailRow {
  id: number;
  settlement_time: number;
  from_time: number;
  to_time: number;
  total_yield: string;
  tx_hash: string;
}

export interface ReconcileUserAssetResult {
  stakeEventsCount: number;
  outflowCount: number;
  ledgerSnapshotsDeduped: number;
  settlementRows: number;
  sumPaidWei: bigint;
  sumExpectedLedgerWei: bigint;
  ledgerSnapshots: LedgerSnapshotRow[];
  settlementDetails: SettlementDetailRow[];
}

/**
 * 读取库表并计算某用户、某资产类型的质押账本应得收益（相对 yield_settlements 各窗口之和）。
 */
export async function reconcileUserAssetFromDb(
  conn: Connection,
  userLower: string,
  assetType: StakeLedgerAsset
): Promise<ReconcileUserAssetResult> {
  const eventTypeFilter = assetType === 'RWA' ? 'RWA' : 'USDT';

  const [stakes] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_address, amount, lock_period, timestamp, tx_hash
     FROM stake_events
     WHERE LOWER(TRIM(user_address)) = ? AND event_type = ?
     ORDER BY timestamp ASC, id ASC`,
    [userLower, eventTypeFilter]
  );

  const [outs] = await conn.query<RowDataPacket[]>(
    `SELECT id, timestamp, balance_type, amount, lock_end_time, event_type, IFNULL(tx_hash,'') AS tx_hash
     FROM balance_snapshots
     WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? AND event_type IN ('withdraw','mature')
     ORDER BY timestamp ASC, id ASC`,
    [userLower, assetType]
  );

  const [settlementRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, settlement_time, from_time, to_time, total_yield, tx_hash
     FROM yield_settlements
     WHERE LOWER(TRIM(user_address)) = ?
       AND asset_type = ?
       AND tx_hash IS NOT NULL AND tx_hash != '' AND tx_hash != 'PENDING'
     ORDER BY settlement_time ASC`,
    [userLower, assetType]
  );

  const ledgerSnapshots = mergeAndDedupeLedgerSnapshots(stakes, outs);
  const settlementDetails: SettlementDetailRow[] = settlementRows.map((r) => ({
    id: Number(r.id),
    settlement_time: Number(r.settlement_time),
    from_time: Number(r.from_time),
    to_time: Number(r.to_time),
    total_yield: String(r.total_yield),
    tx_hash: String(r.tx_hash || ''),
  }));
  const settlements: SettlementRowInput[] = settlementDetails.map((d) => ({
    from_time: d.from_time,
    to_time: d.to_time,
    total_yield: d.total_yield,
  }));

  const { sumPaidWei, sumExpectedLedgerWei } = sumPaidVsLedgerForWindows(
    ledgerSnapshots,
    assetType,
    settlements
  );

  return {
    stakeEventsCount: stakes.length,
    outflowCount: outs.length,
    ledgerSnapshotsDeduped: ledgerSnapshots.length,
    settlementRows: settlementRows.length,
    sumPaidWei,
    sumExpectedLedgerWei,
    ledgerSnapshots,
    settlementDetails,
  };
}
