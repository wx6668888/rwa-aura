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

    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
       VALUES (?, ?, ?, ?, ?, 'stake', ?, ?)`,
      [userAddress, assetType, balanceType, amount, timestamp, lockEndTime, txHash]
    );

    logger.info(`Snapshot recorded: ${userAddress} stake ${amount} ${assetType} (${balanceType})`);
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

    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, tx_hash)
       VALUES (?, ?, ?, ?, ?, 'withdraw', ?)`,
      [userAddress, assetType, balanceType, negativeAmount, timestamp, txHash]
    );

    logger.info(`Snapshot recorded: ${userAddress} withdraw ${amount} ${assetType}`);
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
    await query(
      `INSERT INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type)
       VALUES (?, ?, 'flexible', ?, ?, 'mature')`,
      [userAddress, assetType, amount, timestamp]
    );

    logger.info(`Snapshot recorded: ${userAddress} lock matured ${amount} ${assetType} (${lockPeriod}d)`);
  }
}
