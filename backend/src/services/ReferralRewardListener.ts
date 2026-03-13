import { ethers } from 'ethers';
import { DirectReferralRewardService } from './DirectReferralRewardService';
import logger from '../utils/logger';

/**
 * 推荐奖励事件监听器
 * 监听质押事件，自动记录推荐奖励
 */
export class ReferralRewardListener {
    private provider: ethers.JsonRpcProvider;
    private stakingContract: ethers.Contract;
    private rewardService: DirectReferralRewardService;
    
    constructor(
        providerUrl: string,
        stakingContractAddress: string,
        stakingContractABI: any[]
    ) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.stakingContract = new ethers.Contract(
            stakingContractAddress,
            stakingContractABI,
            this.provider
        );
        this.rewardService = new DirectReferralRewardService();
    }
    
    /**
     * 开始监听质押事件
     */
    startListening(): void {
        // 监听USDT质押事件
        this.stakingContract.on('StakeEvent', async (
            user: string,
            amount: bigint,
            referrer: string,
            stakeId: bigint,
            timestamp: bigint,
            lockPeriod: bigint,
            event: any
        ) => {
            try {
                await this.handleStakeEvent(
                    user,
                    amount.toString(),
                    referrer,
                    Number(stakeId),
                    'USDT',
                    new Date(Number(timestamp) * 1000),
                    Number(lockPeriod)
                );
            } catch (error) {
                logger.error('Failed to handle StakeEvent:', error);
            }
        });
        
        // 监听RWA质押事件
        this.stakingContract.on('RWAStakeEvent', async (
            user: string,
            amount: bigint,
            referrer: string,
            stakeId: bigint,
            timestamp: bigint,
            lockPeriod: bigint,
            event: any
        ) => {
            try {
                // RWA转USDT等价值：amount * 0.85
                const usdtEquivalent = (BigInt(amount.toString()) * BigInt(85)) / BigInt(100);
                
                await this.handleStakeEvent(
                    user,
                    usdtEquivalent.toString(),
                    referrer,
                    Number(stakeId),
                    'RWA',
                    new Date(Number(timestamp) * 1000),
                    Number(lockPeriod)
                );
            } catch (error) {
                logger.error('Failed to handle RWAStakeEvent:', error);
            }
        });
        
        logger.info('Referral reward listener started');
    }
    
    /**
     * 处理质押事件
     */
    private async handleStakeEvent(
        user: string,
        amount: string,
        referrer: string,
        stakeId: number,
        stakeType: 'USDT' | 'RWA',
        stakeTime: Date,
        lockPeriod: number
    ): Promise<void> {
        // 检查是否有推荐人
        if (!referrer || referrer === ethers.ZeroAddress) {
            logger.debug(`No referrer for stake ${stakeId}`);
            return;
        }
        
        logger.info(
            `Processing referral reward: user=${user}, referrer=${referrer}, ` +
            `stakeId=${stakeId}, amount=${amount}, type=${stakeType}, lockPeriod=${lockPeriod}`
        );
        
        // 记录推荐奖励
        await this.rewardService.recordReferralReward(
            referrer,
            user,
            stakeId,
            amount,
            stakeType,
            stakeTime,
            lockPeriod
        );
    }
    
    /**
     * 停止监听
     */
    stopListening(): void {
        this.stakingContract.removeAllListeners();
        logger.info('Referral reward listener stopped');
    }
}
