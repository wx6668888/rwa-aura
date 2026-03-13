import { DirectReferralRewardService } from './services/DirectReferralRewardService';
import { ReferralRewardListener } from './services/ReferralRewardListener';
import { ReferralRewardScheduler } from './services/ReferralRewardScheduler';
import logger from './utils/logger';

/**
 * 初始化直推奖励系统
 */
export function initReferralRewardSystem(
    providerUrl: string,
    stakingContractAddress: string,
    stakingContractABI: any[]
): void {
    try {
        // 1. 启动事件监听器
        const listener = new ReferralRewardListener(
            providerUrl,
            stakingContractAddress,
            stakingContractABI
        );
        listener.startListening();
        
        // 2. 启动定时任务
        const scheduler = new ReferralRewardScheduler();
        scheduler.start();
        
        logger.info('Referral reward system initialized successfully');
        
    } catch (error) {
        logger.error('Failed to initialize referral reward system:', error);
        throw error;
    }
}
