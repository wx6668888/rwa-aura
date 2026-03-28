import { query } from '../config/database.config';
import logger from '../utils/logger';

export class BalanceSnapshotService {
  /**
   * 记录质押事件的余额快照
   */
  async recordStakeSnapshot(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    amount: string,
    lockPeriod: number,
    timestamp: number,
    txHash: string
  ): Promise<void> {
    const balanceType = lockPeriod === 0 ? 'flexible' : `locked_${lockPeriod}` as any;
    const lockEndTime = lockPeriod > 0 ? timestamp + lockPeriod * 86400 : null;

    const addr = userAddress.toLowerCase();
    const dup = await query<Array<{ id: number }>>(
      `SELECT id FROM balance_snapshots
       WHERE LOWER(user_address) = ? AND asset_type = ? AND tx_hash = ? AND event_type = 'stake' AND balance_type = ?
       LIMIT 1`,
      [addr, assetType, txHash, balanceType]
    );
    if (dup.length > 0) {
      logger.warn(
        `Snapshot skip duplicate stake: ${addr} ${assetType} ${balanceType} tx=${txHash} (id=${dup[0].id})`
      );
      return;
    }

    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
       VALUES (?, ?, ?, ?, ?, 'stake', ?, ?)`,
      [addr, assetType, balanceType, amount, timestamp, lockEndTime, txHash]
    );

    logger.info(`Snapshot recorded: ${addr} stake ${amount} ${assetType} (${balanceType})`);
  }

  /**
   * 记录提现事件的余额快照
   */
  async recordWithdrawSnapshot(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    amount: string,
    isLocked: boolean,
    timestamp: number,
    txHash: string
  ): Promise<void> {
    const negativeAmount = `-${amount}`;
    const balanceType = isLocked ? 'flexible' : 'flexible'; // 提现都从灵活扣除
    const addr = userAddress.toLowerCase();

    const dup = await query<Array<{ id: number }>>(
      `SELECT id FROM balance_snapshots
       WHERE LOWER(user_address) = ? AND asset_type = ? AND tx_hash = ? AND event_type = 'withdraw'
       LIMIT 1`,
      [addr, assetType, txHash]
    );
    if (dup.length > 0) {
      logger.warn(`Snapshot skip duplicate withdraw: ${addr} ${assetType} tx=${txHash} (id=${dup[0].id})`);
      return;
    }

    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, tx_hash)
       VALUES (?, ?, ?, ?, ?, 'withdraw', ?)`,
      [addr, assetType, balanceType, negativeAmount, timestamp, txHash]
    );

    logger.info(`Snapshot recorded: ${addr} withdraw ${amount} ${assetType}`);
  }

  /**
   * 记录锁仓到期转灵活的快照
   */
  async recordMaturitySnapshot(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    amount: string,
    lockPeriod: number,
    timestamp: number
  ): Promise<void> {
    const addr = userAddress.toLowerCase();
    const dup = await query<Array<{ id: number }>>(
      `SELECT id FROM balance_snapshots
       WHERE LOWER(user_address) = ? AND asset_type = ? AND event_type = 'mature'
         AND balance_type = 'flexible' AND timestamp = ? AND amount = ?
       LIMIT 1`,
      [addr, assetType, timestamp, amount]
    );
    if (dup.length > 0) {
      logger.warn(`Snapshot skip duplicate mature: ${addr} ${assetType} ts=${timestamp} amount=${amount}`);
      return;
    }

    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type)
       VALUES (?, ?, 'flexible', ?, ?, 'mature')`,
      [addr, assetType, amount, timestamp]
    );

    logger.info(`Snapshot recorded: ${addr} lock matured ${amount} ${assetType} (${lockPeriod}d)`);
  }
}
