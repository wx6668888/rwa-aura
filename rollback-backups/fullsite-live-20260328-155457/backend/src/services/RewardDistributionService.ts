import { RewardEngine } from './RewardEngine';
import { query } from '../config/database.config';
import logger from '../utils/logger';

interface RewardLog {
  stakeId: string;
  userAddress: string;
  stakeAmount: string;
  assetType: 'USDT' | 'RWA';
  beneficiaryCount: number;
  totalRewardAmount: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  timestamp: Date;
}

export class RewardDistributionService {
  private rewardEngine: RewardEngine;

  constructor(rewardEngine: RewardEngine) {
    this.rewardEngine = rewardEngine;
  }

  async processStakeWithLogging(
    userAddress: string,
    stakeAmount: string,
    stakeId: string,
    assetType: 'USDT' | 'RWA'
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`[RewardDistribution] Starting: stakeId=${stakeId}, user=${userAddress}, amount=${stakeAmount}, type=${assetType}`);

      // 计算奖励
      const rewards = await this.rewardEngine.calculateDifferentialRewards(stakeAmount, userAddress, stakeId);
      
      const totalReward = rewards.reduce((sum, r) => sum + BigInt(r.amount), 0n).toString();

      // 发放奖励
      await this.rewardEngine.processStake(userAddress, stakeAmount, stakeId, assetType);

      // 记录成功日志
      await this.logRewardDistribution({
        stakeId,
        userAddress,
        stakeAmount,
        assetType,
        beneficiaryCount: rewards.length,
        totalRewardAmount: totalReward,
        status: 'success',
        timestamp: new Date()
      });

      const duration = Date.now() - startTime;
      logger.info(`[RewardDistribution] ✅ Success: stakeId=${stakeId}, beneficiaries=${rewards.length}, total=${totalReward}, duration=${duration}ms`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[RewardDistribution] ❌ Failed: stakeId=${stakeId}, error=${error.message}, duration=${duration}ms`);

      // 记录失败日志
      await this.logRewardDistribution({
        stakeId,
        userAddress,
        stakeAmount,
        assetType,
        beneficiaryCount: 0,
        totalRewardAmount: '0',
        status: 'failed',
        errorMessage: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  private async logRewardDistribution(log: RewardLog): Promise<void> {
    try {
      await query(
        `INSERT INTO reward_distribution_logs 
        (stake_id, user_address, stake_amount, asset_type, beneficiary_count, total_reward_amount, status, error_message, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [log.stakeId, log.userAddress.toLowerCase(), log.stakeAmount, log.assetType, log.beneficiaryCount, log.totalRewardAmount, log.status, log.errorMessage || null, log.timestamp]
      );
    } catch (error) {
      logger.error('[RewardDistribution] Failed to log:', error);
    }
  }

  async getRewardStats(hours: number = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await query(
      `SELECT 
        COUNT(*) as total_distributions,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'success' THEN beneficiary_count ELSE 0 END) as total_beneficiaries,
        SUM(CASE WHEN status = 'success' THEN CAST(total_reward_amount AS DECIMAL(38,0)) ELSE 0 END) as total_rewards
      FROM reward_distribution_logs
      WHERE timestamp >= ?`,
      [since]
    );

    return stats[0];
  }
}
