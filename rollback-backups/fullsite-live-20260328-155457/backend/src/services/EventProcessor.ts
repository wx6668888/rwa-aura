import { ethers } from 'ethers';
import { getPool } from '../config/database.config';
import { UserStatsService } from './UserStatsService';
import logger from '../utils/logger';

interface StakeEventData {
  user: string;
  amount: string;
  referrer: string;
  stakeId: string;
  timestamp: string;
  lockPeriod: string;
  blockNumber: number;
  txHash: string;
}

export class EventProcessor {
  private userStatsService: UserStatsService;

  constructor() {
    this.userStatsService = new UserStatsService();
  }

  async processStakeEvent(data: StakeEventData, eventType: 'USDT' | 'RWA') {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      // 写入stake_events表
      await conn.execute(
        `INSERT INTO stake_events 
        (event_type, user_address, amount, referrer_address, stake_id, timestamp, lock_period, block_number, tx_hash) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          data.user.toLowerCase(),
          data.amount,
          data.referrer === ethers.ZeroAddress ? null : data.referrer.toLowerCase(),
          data.stakeId,
          data.timestamp,
          data.lockPeriod,
          data.blockNumber,
          data.txHash
        ]
      );

      // 更新user_stats表
      const referrerAddress = data.referrer === ethers.ZeroAddress ? undefined : data.referrer.toLowerCase();
      await this.userStatsService.onStakeEvent(
        data.user.toLowerCase(),
        BigInt(data.amount),
        eventType,
        referrerAddress
      );

      await conn.commit();
      logger.info(`Processed ${eventType} stake event for ${data.user}`);
    } catch (error) {
      await conn.rollback();
      logger.error('Error processing stake event:', error);
      throw error;
    } finally {
      conn.release();
    }
  }
}
