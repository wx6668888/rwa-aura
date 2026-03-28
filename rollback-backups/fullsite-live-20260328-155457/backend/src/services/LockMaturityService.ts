import { query } from '../config/database.config';
import logger from '../utils/logger';
import { BalanceSnapshotService } from './BalanceSnapshotService';

export class LockMaturityService {
  private snapshotService: BalanceSnapshotService;

  constructor() {
    this.snapshotService = new BalanceSnapshotService();
  }

  async processMaturedLocks(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    logger.info('Checking for matured locks...');
    await this.processUSDTMaturedLocks(now);
    await this.processRWAMaturedLocks(now);
  }

  private async processUSDTMaturedLocks(now: number): Promise<void> {
    const maturedLocks = await query<Array<{
      user_address: string;
      lock_index: number;
      principal_amount: string;
      lock_period: number;
    }>>(
      `SELECT user_address, lock_index, principal_amount, lock_period
       FROM usdt_locked_principals
       WHERE lock_end_time <= ? AND is_withdrawn = FALSE AND is_matured = FALSE`,
      [now]
    );

    logger.info(`Found ${maturedLocks.length} matured USDT locks`);
    for (const lock of maturedLocks) {
      await this.convertToFlexible(lock.user_address, 'USDT', lock.principal_amount, lock.lock_period, lock.lock_index, now);
    }
  }

  private async processRWAMaturedLocks(now: number): Promise<void> {
    const maturedLocks = await query<Array<{
      user_address: string;
      lock_index: number;
      principal_amount: string;
      lock_period: number;
    }>>(
      `SELECT user_address, lock_index, principal_amount, lock_period
       FROM rwa_locked_principals
       WHERE lock_end_time <= ? AND is_withdrawn = FALSE AND is_matured = FALSE`,
      [now]
    );

    logger.info(`Found ${maturedLocks.length} matured RWA locks`);
    for (const lock of maturedLocks) {
      await this.convertToFlexible(lock.user_address, 'RWA', lock.principal_amount, lock.lock_period, lock.lock_index, now);
    }
  }

  private async convertToFlexible(userAddress: string, assetType: 'USDT' | 'RWA', amount: string, lockPeriod: number, lockIndex: number, now: number): Promise<void> {
    try {
      const tableName = assetType === 'USDT' ? 'usdt_locked_principals' : 'rwa_locked_principals';
      
      await query(`UPDATE ${tableName} SET is_matured = TRUE WHERE user_address = ? AND lock_index = ?`, [userAddress, lockIndex]);
      await this.snapshotService.recordMaturitySnapshot(userAddress, assetType, amount, lockPeriod, now);
      await query(`INSERT INTO lock_maturity_events (user_address, asset_type, amount, lock_period, maturity_time, processed_time) VALUES (?, ?, ?, ?, ?, ?)`, [userAddress, assetType, amount, lockPeriod, now, now]);
      await query(`INSERT INTO fund_activities (user_address, activity_type, amount, asset_type, timestamp) VALUES (?, 'lock_matured', ?, ?, ?)`, [userAddress, amount, assetType, now]);
      
      logger.info(`✅ Lock matured: ${userAddress} ${amount} ${assetType} (${lockPeriod}d)`);
    } catch (error) {
      logger.error(`Failed to convert lock to flexible: ${userAddress}`, error);
    }
  }
}
