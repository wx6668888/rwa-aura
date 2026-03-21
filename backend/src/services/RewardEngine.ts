import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { query, transaction } from '../config/database.config';
import { 
    RewardDistribution, 
    NODE_REWARD_PERCENTAGES,
    User,
    ReferralRelation 
} from '../models/types';
import logger from '../utils/logger';

/**
 * Reward Calculation Engine
 * 
 * Implements differential reward calculation algorithm
 * 
 * CRITICAL FEATURES:
 * 1. Uses referral_relations table for exact matching (NO LIKE queries)
 * 2. Implements "level compression" logic (压级)
 * 3. Ensures total rewards never exceed 50%
 * 4. Uses BigNumber for 18-bit precision
 * 5. All amounts transmitted as strings
 * 6. Database transactions for atomicity
 * 7. Row-level locks (SELECT ... FOR UPDATE) for concurrency
 */

export interface RewardEngineConfig {
    stakingContractAddress: string;
    stakingContractABI: any[];
    provider: ethers.JsonRpcProvider;
    backendWallet: ethers.Wallet;
    maxRewardPerCall: string; // 18-bit integer as string
}

export class RewardEngine {
    private config: RewardEngineConfig;
    private stakingContract: ethers.Contract;
    
    constructor(config: RewardEngineConfig) {
        this.config = config;
        this.stakingContract = new ethers.Contract(
            config.stakingContractAddress,
            config.stakingContractABI,
            config.backendWallet
        );
    }
    
    /**
     * Calculate differential rewards for a stake
     * 
     * @param stakeAmount Stake amount (18-bit integer as string)
     * @param userAddress User address
     * @param stakeId Stake ID
     * @returns Array of reward distributions
     */
    async calculateDifferentialRewards(
        stakeAmount: string,
        userAddress: string,
        stakeId: string
    ): Promise<RewardDistribution[]> {
        logger.info(`Calculating differential rewards for user=${userAddress}, stakeId=${stakeId}, amount=${stakeAmount}`);
        
        try {
            // 1. Get all ancestors using referral_relations table (exact matching)
            const ancestors = await this.getAncestors(userAddress);
            
            if (ancestors.length === 0) {
                logger.info('No ancestors found, no differential rewards');
                return [];
            }
            
            logger.info(`Found ${ancestors.length} ancestors`);
            
            // 2. Calculate rewards for each ancestor
            const rewards: RewardDistribution[] = [];
            let maxAllocatedPercentage = 0; // Track highest percentage already allocated
            
            const stakeAmountBN = new BigNumber(stakeAmount);
            
            for (const ancestor of ancestors) {
                // Get ancestor's node level
                const ancestorInfo = await this.getUserInfo(ancestor.ancestor_address);
                const ancestorLevel = ancestorInfo.node_level;
                const ancestorPercentage = NODE_REWARD_PERCENTAGES[ancestorLevel];
                
                // Calculate differential percentage (level compression logic)
                const differentialPercentage = Math.max(0, ancestorPercentage - maxAllocatedPercentage);
                
                if (differentialPercentage > 0) {
                    // Calculate base reward amount
                    const calculatedReward = stakeAmountBN
                        .multipliedBy(differentialPercentage)
                        .integerValue(BigNumber.ROUND_DOWN);
                    
                    // ========== Burn Mechanism: Single reward cap (50% of own stake) ==========
                    const ancestorStakedBN = new BigNumber(ancestorInfo.total_staked);
                    const maxRewardByStake = ancestorStakedBN
                        .multipliedBy(0.5) // 50% of own stake
                        .integerValue(BigNumber.ROUND_DOWN);
                    
                    // Take the minimum (burn mechanism)
                    const actualReward = BigNumber.min(calculatedReward, maxRewardByStake);
                    const isBurned = calculatedReward.isGreaterThan(maxRewardByStake);
                    
                    if (actualReward.isGreaterThan(0)) {
                        rewards.push({
                            beneficiary: ancestor.ancestor_address,
                            amount: actualReward.toString(),
                            percentage: differentialPercentage,
                            nodeLevel: ancestorLevel,
                            fromUser: userAddress,
                            stakeId: parseInt(stakeId),
                            burned: isBurned,
                            originalAmount: isBurned ? calculatedReward.toString() : undefined
                        });
                        
                        if (isBurned) {
                            logger.warn(
                                `Reward burned for ${ancestor.ancestor_address}: ` +
                                `calculated=${calculatedReward.toString()}, ` +
                                `actual=${actualReward.toString()}, ` +
                                `cap=${maxRewardByStake.toString()} (50% of stake=${ancestorStakedBN.toString()})`
                            );
                        }
                        
                        // Update max allocated percentage
                        maxAllocatedPercentage = Math.max(maxAllocatedPercentage, ancestorPercentage);
                        
                        logger.info(`Reward calculated: beneficiary=${ancestor.ancestor_address}, level=V${ancestorLevel}, percentage=${differentialPercentage * 100}%, amount=${actualReward.toString()}${isBurned ? ' (BURNED)' : ''}`);
                    }
                }
                
                // Stop if we've reached 50% (L9 level, max 40% but total can reach 50%)
                if (maxAllocatedPercentage >= 0.5) {
                    break;
                }
            }
            
            // 3. Verify total rewards don't exceed 50%
            const totalRewards = rewards.reduce((sum, r) => sum.plus(r.amount), new BigNumber(0));
            const maxAllowed = stakeAmountBN.multipliedBy(0.5).integerValue(BigNumber.ROUND_DOWN);
            
            if (totalRewards.isGreaterThan(maxAllowed)) {
                logger.error(`Total rewards exceed 50% limit: ${totalRewards.toString()} > ${maxAllowed.toString()}`);
                throw new Error('Total rewards exceed 50% limit');
            }
            
            logger.info(`Total differential rewards: ${totalRewards.toString()} (${rewards.length} beneficiaries)`);
            
            return rewards;
            
        } catch (error) {
            logger.error('Failed to calculate differential rewards:', error);
            throw error;
        }
    }
    
    /**
     * Get all ancestors of a user using referral_relations table
     * CRITICAL: Uses exact matching, NO LIKE queries
     */
    private async getAncestors(userAddress: string): Promise<ReferralRelation[]> {
        const ancestors = await query<ReferralRelation[]>(
            `SELECT ancestor_address, depth 
             FROM referral_relations 
             WHERE user_address = ? 
             ORDER BY depth ASC`,
            [userAddress.toLowerCase()]
        );
        
        return ancestors;
    }
    
    /**
     * Get user information
     */
    private async getUserInfo(userAddress: string): Promise<User> {
        const users = await query<User[]>(
            'SELECT * FROM users WHERE address = ?',
            [userAddress.toLowerCase()]
        );
        
        if (users.length === 0) {
            throw new Error(`User not found: ${userAddress}`);
        }
        
        return users[0];
    }
    
    /**
     * Distribute rewards to beneficiaries
     * 
     * CRITICAL: Uses database transaction for atomicity
     * CRITICAL: Uses row-level locks (SELECT ... FOR UPDATE) for concurrency
     */
    async distributeRewards(rewards: RewardDistribution[]): Promise<void> {
        if (rewards.length === 0) {
            logger.info('No rewards to distribute');
            return;
        }
        
        logger.info(`Distributing rewards to ${rewards.length} beneficiaries`);
        
        try {
            await transaction(async (connection) => {
                for (const reward of rewards) {
                    // Lock user row for update (prevent concurrent conflicts)
                    await connection.query(
                        'SELECT address FROM users WHERE address = ? FOR UPDATE',
                        [reward.beneficiary]
                    );
                    
                    // Update user's USDT rewards
                    await connection.query(
                        'UPDATE users SET usdt_rewards = usdt_rewards + ? WHERE address = ?',
                        [reward.amount, reward.beneficiary]
                    );
                    
                    // Insert reward record
                    await connection.query(
                        `INSERT INTO rewards (user_address, reward_type, token_type, amount, from_user, stake_id, timestamp)
                         VALUES (?, 'differential', 'USDT', ?, ?, ?, NOW())`,
                        [reward.beneficiary, reward.amount, reward.fromUser, reward.stakeId]
                    );
                    
                    logger.info(`✅ Reward distributed: ${reward.beneficiary} received ${reward.amount} USDT`);
                }
            });
            
            logger.info('All rewards distributed successfully');
            
        } catch (error) {
            logger.error('Failed to distribute rewards:', error);
            throw error;
        }
    }
    
    /**
     * Call contract to update user rewards
     * 
     * CRITICAL: Passes stakeId to prevent duplicate processing.
     * For USDT stakes: usdtAmount on contract (rwaPending + usdtRewards for referrers).
     * For RWA stakes: rwAmount on contract (rwaStakes[].rwaPending for referrers).
     */
    async updateContractRewards(rewards: RewardDistribution[], assetType: 'USDT' | 'RWA'): Promise<void> {
        if (rewards.length === 0) {
            logger.info('No rewards to update on contract');
            return;
        }
        
        logger.info(`Updating contract rewards for ${rewards.length} beneficiaries (assetType=${assetType})`);
        
        try {
            for (const reward of rewards) {
                // Verify reward doesn't exceed maxRewardPerCall
                const rewardBN = new BigNumber(reward.amount);
                const maxBN = new BigNumber(this.config.maxRewardPerCall);
                
                if (rewardBN.isGreaterThan(maxBN)) {
                    logger.error(`Reward exceeds maxRewardPerCall: ${reward.amount} > ${this.config.maxRewardPerCall}`);
                    throw new Error('Reward exceeds maxRewardPerCall');
                }
                
                // Contract: usdtAmount==0 => update rwaStakes[].rwaPending; else update users[].rwaPending+usdtRewards
                const rwAmount = assetType === 'RWA' ? reward.amount : '0';
                const usdtAmount = assetType === 'USDT' ? reward.amount : '0';
                
                const tx = await this.stakingContract.updateUserRewards(
                    reward.beneficiary,
                    rwAmount,
                    usdtAmount,
                    reward.stakeId
                );
                
                logger.info(`Transaction sent: ${tx.hash}`);
                
                // Wait for confirmation
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    logger.info(`✅ Contract updated: ${reward.beneficiary}, tx=${tx.hash}`);
                } else {
                    logger.error(`❌ Transaction failed: ${tx.hash}`);
                    throw new Error(`Transaction failed: ${tx.hash}`);
                }
            }
            
            logger.info('All contract rewards updated successfully');
            
        } catch (error) {
            logger.error('Failed to update contract rewards:', error);
            throw error;
        }
    }
    
    /**
     * Validate multiple caps (global, single, daily)
     * 
     * Checks all cap limits before distributing rewards
     */
    async validateMultipleCaps(newRewards: RewardDistribution[]): Promise<{
        isValid: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];
        
        try {
            // Get contract state
            const totalStaked = await this.stakingContract.getTotalStaked();
            const totalDynamicRewardsPaid = await this.stakingContract.getTotalDynamicRewardsPaid();
            
            // Calculate new total rewards
            const newRewardsTotal = newRewards.reduce(
                (sum, r) => sum.plus(new BigNumber(r.amount)),
                new BigNumber(0)
            );
            
            // 1. Global cap validation (50% hard limit)
            const projectedTotal = new BigNumber(totalDynamicRewardsPaid.toString())
                .plus(newRewardsTotal);
            const maxGlobalRewards = new BigNumber(totalStaked.toString())
                .multipliedBy(0.5)
                .integerValue(BigNumber.ROUND_DOWN);
            
            if (projectedTotal.isGreaterThan(maxGlobalRewards)) {
                errors.push(`Global cap exceeded: ${projectedTotal.toString()} > ${maxGlobalRewards.toString()}`);
            }
            
            // 2. Single reward cap validation (50% of stake) - already handled in burn mechanism
            // 3. Daily cap validation (15% of stake)
            for (const reward of newRewards) {
                const userInfo = await this.getUserInfo(reward.beneficiary);
                const userStakedBN = new BigNumber(userInfo.total_staked);
                const rewardBN = new BigNumber(reward.amount);

                // Daily cap: daily rewards ≤ staked × 15%
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStart = Math.floor(today.getTime() / 1000);
                
                const dailyRewards = await query<{ total: string }[]>(
                    `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(38, 0))), 0) as total
                     FROM rewards
                     WHERE user_address = ?
                       AND reward_type = 'differential'
                       AND token_type = 'USDT'
                       AND UNIX_TIMESTAMP(timestamp) >= ?`,
                    [reward.beneficiary.toLowerCase(), todayStart]
                );
                
                const dailyRewardsBN = new BigNumber(dailyRewards[0]?.total || '0');
                const maxDailyRewards = userStakedBN
                    .multipliedBy(0.15) // 15% of stake
                    .integerValue(BigNumber.ROUND_DOWN);
                const projectedDailyRewards = dailyRewardsBN.plus(rewardBN);
                
                if (projectedDailyRewards.isGreaterThan(maxDailyRewards)) {
                    errors.push(
                        `Daily cap exceeded for ${reward.beneficiary}: ` +
                        `${projectedDailyRewards.toString()} > ${maxDailyRewards.toString()} (15% of staked)`
                    );
                }
            }
            
            const isValid = errors.length === 0;
            
            if (!isValid) {
                logger.warn(`Multiple caps validation failed: ${errors.join('; ')}`);
            }
            
            return { isValid, errors };
            
        } catch (error) {
            logger.error('Failed to validate multiple caps:', error);
            throw error;
        }
    }
    
    /**
     * Validate reward limit (50% hard cap) - Legacy method for backward compatibility
     * 
     * @deprecated Use validateMultipleCaps instead
     */
    async validateRewardLimit(newRewards: RewardDistribution[]): Promise<boolean> {
        const result = await this.validateMultipleCaps(newRewards);
        return result.isValid;
    }
    
    /**
     * Process stake and distribute rewards (complete flow)
     * 
     * This is the main entry point called by EventMonitor.
     * assetType: 'USDT' => referrer rewards go to users[].rwaPending/usdtRewards; 'RWA' => go to rwaStakes[].rwaPending.
     */
    async processStake(
        userAddress: string,
        stakeAmount: string,
        stakeId: string,
        assetType: 'USDT' | 'RWA' = 'USDT'
    ): Promise<void> {
        logger.info(`Processing stake: user=${userAddress}, stakeId=${stakeId}, amount=${stakeAmount}, assetType=${assetType}`);
        
        try {
            // 1. Calculate differential rewards
            const rewards = await this.calculateDifferentialRewards(
                stakeAmount,
                userAddress,
                stakeId
            );
            
            if (rewards.length === 0) {
                logger.info('No rewards to distribute');
                return;
            }
            
            // 2. Validate multiple caps (global, personal, single, daily) — only applies to USDT reward path
            if (assetType === 'USDT') {
                const validationResult = await this.validateMultipleCaps(rewards);
                if (!validationResult.isValid) {
                    throw new Error(`Multiple caps validation failed: ${validationResult.errors.join('; ')}`);
                }
            }
            
            // 3. Distribute rewards in database
            await this.distributeRewards(rewards);
            
            // 4. Update contract (call updateUserRewards for each beneficiary with correct rwAmount/usdtAmount)
            await this.updateContractRewards(rewards, assetType);
            
            logger.info(`✅ Stake processed successfully: stakeId=${stakeId}`);
            
        } catch (error) {
            logger.error(`Failed to process stake ${stakeId}:`, error);
            throw error;
        }
    }
}

export default RewardEngine;
