import { query } from '../config/database.config';
import logger from '../utils/logger';
import { normalizeSettlementUserAddress } from '../utils/settlementAddress';
import {
  computeYieldFromLedgerSnapshots,
  dedupeLedgerSnapshotsForYield,
  type LedgerSnapshotRow,
} from './yieldLedgerMath';

interface BalanceSnapshot {
  timestamp: number;
  balance_type: string;
  amount: string;
  lock_end_time: number | null;
  event_type: string;
  /** 与 BalanceSnapshotService / dedupe-balance-snapshots 键一致，用于去重 */
  tx_hash: string;
}

export class PreciseYieldCalculator {
  async calculateYield(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    fromTime: number,
    toTime: number
  ): Promise<{ totalYield: string; details: any[] }> {
    const addr = normalizeSettlementUserAddress(userAddress);
    logger.info(`Calculating yield for ${addr} (${assetType}) from ${fromTime} to ${toTime}`);

    const allSnapshots = await this.getAllSnapshots(addr, assetType, toTime);
    if (allSnapshots.length === 0) return { totalYield: '0', details: [] };

    const deduped = dedupeLedgerSnapshotsForYield(allSnapshots as LedgerSnapshotRow[]);
    if (deduped.length < allSnapshots.length) {
      logger.warn(
        `PreciseYieldCalculator: stripped ${allSnapshots.length - deduped.length} duplicate balance_snapshots rows (db should be deduped + unique index)`
      );
    }

    return computeYieldFromLedgerSnapshots(deduped, assetType, fromTime, toTime);
  }

  /**
   * 与 audit-overpaid-yield-dup-snapshots / dedupe-balance-snapshots 相同规则：
   * 有 tx 则按 (tx, event_type, balance_type) 只保留首条（id 最小）；无 tx 则按整行业务字段。
   */
  private async getAllSnapshots(normalizedUserAddress: string, assetType: 'USDT' | 'RWA', toTime: number): Promise<BalanceSnapshot[]> {
    const rows = await query<BalanceSnapshot[]>(
      `SELECT timestamp, balance_type, amount, lock_end_time, event_type, IFNULL(tx_hash,'') AS tx_hash
       FROM balance_snapshots
       WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? AND timestamp <= ?
       ORDER BY timestamp ASC, id ASC`,
      [normalizedUserAddress, assetType, toTime]
    );
    return rows;
  }

  async getLastSettlementTime(userAddress: string, assetType: 'USDT' | 'RWA'): Promise<number> {
    const addr = normalizeSettlementUserAddress(userAddress);
    const result = await query<Array<{ settlement_time: number }>>(
      `SELECT settlement_time FROM yield_settlements WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? ORDER BY settlement_time DESC LIMIT 1`,
      [addr, assetType]
    );
    if (result.length > 0) return result[0].settlement_time;

    const firstStake = await query<Array<{ timestamp: number }>>(
      `SELECT timestamp FROM balance_snapshots WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? AND event_type = 'stake' ORDER BY timestamp ASC LIMIT 1`,
      [addr, assetType]
    );
    return firstStake.length > 0 ? firstStake[0].timestamp : 0;
  }
}
