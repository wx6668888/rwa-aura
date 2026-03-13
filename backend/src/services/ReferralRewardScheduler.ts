import * as cron from 'node-cron';
import { DirectReferralRewardService } from './DirectReferralRewardService';
import logger from '../utils/logger';

/**
 * 推荐奖励定时任务
 * 每周一凌晨执行结算
 */
export class ReferralRewardScheduler {
    private rewardService: DirectReferralRewardService;
    private cronJob: cron.ScheduledTask | null = null;
    
    constructor() {
        this.rewardService = new DirectReferralRewardService();
    }
    
    /**
     * 启动定时任务
     * 每周一凌晨2点执行
     */
    start(): void {
        // Cron表达式：每周一凌晨2点
        this.cronJob = cron.schedule('0 2 * * 1', async () => {
            logger.info('Starting weekly referral reward settlement...');
            
            try {
                await this.rewardService.weeklySettlement();
                logger.info('Weekly settlement completed successfully');
            } catch (error) {
                logger.error('Weekly settlement failed:', error);
            }
        });
        
        logger.info('Referral reward scheduler started (runs every Monday at 2:00 AM)');
    }
    
    /**
     * 手动触发结算（用于测试）
     */
    async triggerManually(): Promise<void> {
        logger.info('Manually triggering settlement...');
        await this.rewardService.weeklySettlement();
    }
    
    /**
     * 停止定时任务
     */
    stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Referral reward scheduler stopped');
        }
    }
}
