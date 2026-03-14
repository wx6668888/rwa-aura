import BigNumber from 'bignumber.js';
import { query, transaction } from '../config/database.config';
import logger from '../utils/logger';

/**
 * 直推奖励服务
 * 
 * 核心规则：
 * 1. 只奖励直接推荐人（一级）
 * 2. 下级必须质押满30天才发放奖励
 * 3. 每周结算一次
 * 4. 奖励比例根据推荐人等级（L1-L9: 3%-40%）
 */

// 等级奖励比例
const LEVEL_REWARD_RATES: Record<number, number> = {
    1: 300,   // 3%
    2: 500,   // 5%
    3: 800,   // 8%
    4: 1200,  // 12%
    5: 1700,  // 17%
    6: 2300,  // 23%
    7: 3000,  // 30%
    8: 3500,  // 35%
    9: 4000   // 40%
};

export class DirectReferralRewardService {
    
    /**
     * 记录直推奖励（质押时调用）
     * 
     * @param lockPeriod 锁仓期（天）：0=灵活，30/90/180/365=锁仓
     */
    async recordReferralReward(
        referrerAddress: string,
        refereeAddress: string,
        stakeId: number,
        stakeAmount: string,
        stakeType: 'USDT' | 'RWA',
        stakeTime: Date,
        lockPeriod: number
    ): Promise<void> {
        try {
            if (lockPeriod < 30) {
                return;
            }
            
            // 去重检查
            const [existing] = await query(
                'SELECT id FROM direct_referral_rewards WHERE stake_id = ?',
                [stakeId]
            ) as any[];
            
            if (existing) {
                logger.warn(`Referral reward already exists: stakeId=${stakeId}`);
                return;
            }
            
            // 获取推荐人等级
            const [referrerInfo] = await query(
                'SELECT node_level FROM users WHERE LOWER(address) = LOWER(?)',
                [referrerAddress]
            ) as any[];
            
            if (!referrerInfo) {
                logger.warn(`Referrer not found: ${referrerAddress}`);
                return;
            }
            
            const referrerLevel = referrerInfo.node_level || 1;
            const rewardRate = LEVEL_REWARD_RATES[referrerLevel];
            
            // 计算奖励
            let stakeAmountDecimal = new BigNumber(stakeAmount).dividedBy(1e18);
            
            // RWA质押：合约发出的amount是USDT等值，需要还原为原始RWA金额
            if (stakeType === 'RWA') {
                stakeAmountDecimal = stakeAmountDecimal.dividedBy(0.85);
            }
            
            let rewardAmount = stakeAmountDecimal.multipliedBy(rewardRate).dividedBy(10000);
            
            // RWA奖励转USDT
            if (stakeType === 'RWA') {
                rewardAmount = rewardAmount.multipliedBy(0.85);
            }
            
            // 插入记录
            await query(
                `INSERT INTO direct_referral_rewards 
                (referrer_address, referee_address, stake_id, stake_amount, stake_type, 
                 referrer_level, reward_rate, reward_amount, stake_time, maturity_time, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                [
                    referrerAddress.toLowerCase(),
                    refereeAddress.toLowerCase(),
                    stakeId,
                    stakeAmountDecimal.toString(),
                    stakeType,
                    referrerLevel,
                    rewardRate,
                    rewardAmount.decimalPlaces(18).toString(),
                    stakeTime,
                    stakeTime
                ]
            );
            
            logger.info(`Recorded referral reward: stakeId=${stakeId}, type=${stakeType}, amount=${rewardAmount.toFixed(2)} USDT`);
            
        } catch (error) {
            logger.error('Failed to record referral reward:', error);
            throw error;
        }
    }
    
    /**
     * 获取待发放的奖励
     */
    async getPendingPayouts(): Promise<any[]> {
        try {
            const rewards = await query(
                `SELECT referrer_address, SUM(reward_amount) as total_reward, COUNT(*) as count
                FROM direct_referral_rewards
                WHERE status = 'PENDING'
                GROUP BY referrer_address`,
                []
            ) as any[];
            
            return rewards;
        } catch (error) {
            logger.error('Failed to get pending payouts:', error);
            throw error;
        }
    }
    
    /**
     * 每周结算（批量发放）
     */
    async weeklySettlement(): Promise<void> {
        try {
            // 1. 创建结算批次
            const batchNumber = this.generateBatchNumber();
            const now = new Date();
            
            await query(
                `INSERT INTO referral_settlement_batches 
                (batch_number, start_time, end_time, status)
                VALUES (?, ?, ?, 'PROCESSING')`,
                [batchNumber, now, now]
            );
            
            // 3. 获取待发放奖励
            const payouts = await this.getPendingPayouts();
            
            if (payouts.length === 0) {
                logger.info('No rewards to settle');
                await query(
                    `UPDATE referral_settlement_batches 
                    SET status = 'COMPLETED', completed_at = NOW() 
                    WHERE batch_number = ?`,
                    [batchNumber]
                );
                return;
            }
            
            logger.info(`Processing ${payouts.length} payouts in batch ${batchNumber}`);
            
            // 4. 批量发放到链上
            const { ReferralRewardDistributor } = await import('./ReferralRewardDistributor');
            const distributor = new ReferralRewardDistributor();
            await distributor.distributeRewards();
            
            // 5. 计算总额并更新批次状态
            let totalRewards = new BigNumber(0);
            let totalRecords = 0;
            for (const payout of payouts) {
                totalRewards = totalRewards.plus(payout.total_reward);
                totalRecords += payout.count;
            }
            
            // 6. 更新批次状态
            await query(
                `UPDATE referral_settlement_batches 
                SET status = 'COMPLETED', 
                    total_rewards = ?, 
                    total_records = ?,
                    completed_at = NOW() 
                WHERE batch_number = ?`,
                [totalRewards.toString(), totalRecords, batchNumber]
            );
            
            logger.info(
                `Settlement completed: batch=${batchNumber}, ` +
                `total=${totalRewards.toString()}, records=${totalRecords}`
            );
            
        } catch (error) {
            logger.error('Failed to process weekly settlement:', error);
            throw error;
        }
    }
    
    /**
     * 生成批次号（格式：2026-W11）
     */
    private generateBatchNumber(): string {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }
    
    /**
     * 获取周数
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
