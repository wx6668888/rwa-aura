import { ethers } from 'ethers';
import { query, transaction } from '../config/database.config';
import { User } from '../models/types';
import logger from '../utils/logger';
import BigNumber from 'bignumber.js';

/**
 * Daily Yield Service
 * 
 * Calculates and distributes daily static yield (0.8% of staked amount)
 * 
 * FEATURES:
 * 1. Calculate 0.8% daily yield for all active users
 * 2. Only calculate for users with isActive = true
 * 3. Update rwaPending balance in database
 * 4. Update rwaPending balance on contract
 * 5. Record yield in rewards table
 * 6. Run as scheduled task (cron job)
 */

export interface DailyYieldConfig {
    baseYieldRate?: number; // 0.008 = 0.8% (base rate)
    yieldRate?: number; // alias for baseYieldRate
    rpcUrl?: string;
    stakingContractAddress?: string;
    backendPrivateKey?: string;
    rwaTokenAddress?: string;
    usdtTokenAddress?: string;
    priceOracle?: {
        getRwaPrice: () => Promise<number>;
    };
    // Dynamic yield thresholds
    healthThresholdHigh?: number; // 0.5 = 50%
    healthThresholdLow?: number; // 0.3 = 30%
    yieldRateHigh?: number; // 0.008 = 0.8%
    yieldRateMedium?: number; // 0.006 = 0.6%
    yieldRateLow?: number; // 0.005 = 0.5%
}

/** Internal config with required numeric fields after defaults applied */
interface ResolvedDailyYieldConfig extends DailyYieldConfig {
    baseYieldRate: number;
    healthThresholdHigh: number;
    healthThresholdLow: number;
    yieldRateHigh: number;
    yieldRateMedium: number;
    yieldRateLow: number;
}

export interface PoolHealthStatus {
    healthRatio: number; // 0-1 (0 = 0%, 1 = 100%)
    availableFunds: string; // Available USDT in contract (18-bit integer as string)
    requiredPayouts: string; // Required payouts (18-bit integer as string)
    yieldRate: number; // Current yield rate based on health
    status: 'healthy' | 'warning' | 'critical';
}

export class DailyYieldService {
    private config: ResolvedDailyYieldConfig;
    private provider?: ethers.JsonRpcProvider;
    private stakingContract?: ethers.Contract;
    private usdtToken?: ethers.Contract;
    private rwaPrice: number = 0.85; // Default RWA price
    
    constructor(config: DailyYieldConfig) {
        const baseRate = config.baseYieldRate ?? config.yieldRate ?? 0.008;
        this.config = {
            ...config,
            baseYieldRate: baseRate,
            healthThresholdHigh: config.healthThresholdHigh ?? 0.5,
            healthThresholdLow: config.healthThresholdLow ?? 0.3,
            yieldRateHigh: config.yieldRateHigh ?? 0.008,
            yieldRateMedium: config.yieldRateMedium ?? 0.006,
            yieldRateLow: config.yieldRateLow ?? 0.005
        } as ResolvedDailyYieldConfig;
        
        // Initialize provider and contract if RPC URL is provided
        if (config.rpcUrl && config.stakingContractAddress && config.backendPrivateKey) {
            this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
            const wallet = new ethers.Wallet(config.backendPrivateKey, this.provider);
            
            // StakingContract ABI
            const stakingABI = [
                "function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId) external",
                "function getUserStakeInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256, address, uint8, uint256)",
                "function getTotalStaked() external view returns (uint256)",
                "function getTotalDynamicRewardsPaid() external view returns (uint256)"
            ];
            
            this.stakingContract = new ethers.Contract(
                config.stakingContractAddress,
                stakingABI,
                wallet
            );
            
            // USDT Token ABI (for balance check)
            if (config.usdtTokenAddress) {
                const usdtABI = [
                    "function balanceOf(address account) external view returns (uint256)"
                ];
                this.usdtToken = new ethers.Contract(
                    config.usdtTokenAddress,
                    usdtABI,
                    wallet
                );
            }
        }
    }
    
    /**
     * Calculate pool health ratio
     * Health = Available Funds / Required Payouts
     * @returns Pool health status
     */
    async calculatePoolHealth(): Promise<PoolHealthStatus> {
        try {
            if (!this.stakingContract || !this.usdtToken || !this.config.stakingContractAddress) {
                // Return default healthy status if contracts not initialized
                return {
                    healthRatio: 1.0,
                    availableFunds: '0',
                    requiredPayouts: '0',
                    yieldRate: this.config.yieldRateHigh,
                    status: 'healthy'
                };
            }
            
            // Get available USDT balance in contract
            const contractBalance = await this.usdtToken.balanceOf(this.config.stakingContractAddress);
            const availableFundsBN = new BigNumber(contractBalance.toString());
            
            // Get total staked amount
            const totalStaked = await this.stakingContract.getTotalStaked();
            const totalStakedBN = new BigNumber(totalStaked.toString());
            
            // Calculate required payouts (daily yield for all active users)
            // Required payouts = total_staked × yield_rate
            const requiredPayoutsBN = totalStakedBN.multipliedBy(this.config.baseYieldRate);
            
            // Calculate health ratio
            let healthRatio = 1.0;
            if (requiredPayoutsBN.isGreaterThan(0)) {
                healthRatio = availableFundsBN.dividedBy(requiredPayoutsBN).toNumber();
            }
            
            // Determine status
            let status: 'healthy' | 'warning' | 'critical';
            if (healthRatio >= this.config.healthThresholdHigh) {
                status = 'healthy';
            } else if (healthRatio >= this.config.healthThresholdLow) {
                status = 'warning';
            } else {
                status = 'critical';
            }
            
            // Determine yield rate based on health
            let yieldRate = this.config.yieldRateHigh;
            if (healthRatio < this.config.healthThresholdLow) {
                yieldRate = this.config.yieldRateLow; // 0.5%
            } else if (healthRatio < this.config.healthThresholdHigh) {
                yieldRate = this.config.yieldRateMedium; // 0.6%
            }
            
            logger.info(
                `Pool health: ${(healthRatio * 100).toFixed(2)}% ` +
                `(available=${availableFundsBN.toString()}, required=${requiredPayoutsBN.toString()}, yieldRate=${yieldRate * 100}%)`
            );
            
            return {
                healthRatio,
                availableFunds: availableFundsBN.toString(),
                requiredPayouts: requiredPayoutsBN.toString(),
                yieldRate,
                status
            };
            
        } catch (error) {
            logger.error('Failed to calculate pool health:', error);
            // Return default healthy status on error
            return {
                healthRatio: 1.0,
                availableFunds: '0',
                requiredPayouts: '0',
                yieldRate: this.config.yieldRateHigh,
                status: 'healthy'
            };
        }
    }
    
    /**
     * Calculate and distribute daily yield for all active users
     * Uses dynamic yield rate based on pool health
     */
    async calculateDailyYield(): Promise<{
        processedUsers: number;
        totalYield: string;
        poolHealth: PoolHealthStatus;
    }> {
        logger.info('Starting daily yield calculation...');
        
        try {
            // 1. Calculate pool health and dynamic yield rate
            const poolHealth = await this.calculatePoolHealth();
            const currentYieldRate = poolHealth.yieldRate;
            
            logger.info(
                `Pool health: ${(poolHealth.healthRatio * 100).toFixed(2)}% ` +
                `(${poolHealth.status}), using yield rate: ${(currentYieldRate * 100).toFixed(2)}%`
            );
            
            // Alert if pool health is critical
            if (poolHealth.status === 'critical') {
                logger.error(`⚠️ CRITICAL: Pool health is ${(poolHealth.healthRatio * 100).toFixed(2)}%`);
                // TODO: Send alert to Telegram/Email
            } else if (poolHealth.status === 'warning') {
                logger.warn(`⚠️ WARNING: Pool health is ${(poolHealth.healthRatio * 100).toFixed(2)}%`);
            }
            
            // Get RWA price (if price oracle is available)
            if (this.config.priceOracle) {
                try {
                    this.rwaPrice = await this.config.priceOracle.getRwaPrice();
                    logger.info(`RWA price: ${this.rwaPrice} USDT`);
                } catch (error) {
                    logger.warn('Failed to get RWA price, using default 0.85');
                }
            }
            
            // Get all active users with USDT staked amount
            const usdtUsers = await query<User[]>(
                `SELECT address, total_staked, rwa_pending
                 FROM users
                 WHERE is_active = TRUE AND total_staked > 0`
            );
            
            // Get all active users with RWA staked amount
            const rwaUsers = await query<Array<{ user_address: string; total_staked_rwa: string; rwa_pending: string }>>(
                `SELECT user_address, total_staked_rwa, rwa_pending
                 FROM rwa_stakes
                 WHERE is_active = TRUE AND total_staked_rwa > 0`
            );
            
            logger.info(`Found ${usdtUsers.length} USDT staking users and ${rwaUsers.length} RWA staking users for yield calculation`);
            
            if (usdtUsers.length === 0 && rwaUsers.length === 0) {
                return {
                    processedUsers: 0,
                    totalYield: '0',
                    poolHealth
                };
            }
            
            let totalYield = new BigNumber(0);
            let processedCount = 0;
            
            // Process USDT staking users
            for (const user of usdtUsers) {
                try {
                    const yieldAmount = await this.calculateUserYield(user, currentYieldRate);
                    
                    if (yieldAmount.gt(0)) {
                        // Update database
                        await this.distributeYield(user.address, yieldAmount.toString(), 'USDT');
                        
                        // Update contract (if available)
                        if (this.stakingContract) {
                            await this.updateContractRewards(user.address, yieldAmount.toString(), false);
                        }
                        
                        totalYield = totalYield.plus(yieldAmount);
                        processedCount++;
                    }
                } catch (error) {
                    logger.error(`Failed to process USDT yield for user ${user.address}:`, error);
                    // Continue with next user
                }
            }
            
            // Process RWA staking users
            for (const rwaUser of rwaUsers) {
                try {
                    const yieldAmount = await this.calculateRWAYield(rwaUser.user_address, currentYieldRate);
                    
                    if (yieldAmount.gt(0)) {
                        // Update database
                        await this.distributeRWAYield(rwaUser.user_address, yieldAmount.toString());
                        
                        // Update contract (if available)
                        if (this.stakingContract) {
                            await this.updateContractRewards(rwaUser.user_address, yieldAmount.toString(), true);
                        }
                        
                        totalYield = totalYield.plus(yieldAmount);
                        processedCount++;
                    }
                } catch (error) {
                    logger.error(`Failed to process RWA yield for user ${rwaUser.user_address}:`, error);
                    // Continue with next user
                }
            }
            
            logger.info(
                `✅ Daily yield calculation completed: ${processedCount} users, ` +
                `total yield: ${totalYield.toString()}, ` +
                `pool health: ${(poolHealth.healthRatio * 100).toFixed(2)}%`
            );
            
            return {
                processedUsers: processedCount,
                totalYield: totalYield.toString(),
                poolHealth
            };
            
        } catch (error) {
            logger.error('Failed to calculate daily yield:', error);
            throw error;
        }
    }
    
    /**
     * Calculate yield for a single user
     * @param user User information
     * @param yieldRate Dynamic yield rate (based on pool health)
     */
    private async calculateUserYield(user: User, yieldRate?: number): Promise<BigNumber> {
        // Get all active stakes for this user with lock periods
        const stakes = await query<Array<{ amount: string; lock_period: number }>>(
            `SELECT amount, lock_period
             FROM stakes
             WHERE user_address = ? AND amount > 0
             ORDER BY timestamp DESC`,
            [user.address]
        );
        
        const currentYieldRate = yieldRate !== undefined 
            ? new BigNumber(yieldRate)
            : new BigNumber(this.config.baseYieldRate);
        
        let totalRwaYield = new BigNumber(0);
        
        // Calculate yield for each stake based on its lock period
        for (const stake of stakes) {
            const stakeAmount = new BigNumber(stake.amount);
            const lockPeriod = stake.lock_period || 0;
            
            // Get lock period multiplier
            const lockMultiplier = this.getLockPeriodMultiplier(lockPeriod);
            
            // Calculate adjusted yield rate (base rate × lock multiplier)
            const adjustedYieldRate = currentYieldRate.multipliedBy(lockMultiplier);
            
            // Calculate USDT yield for this stake
            const usdtYield = stakeAmount.multipliedBy(adjustedYieldRate);
            
            // Convert to RWA (divide by RWA price)
            const rwaYield = usdtYield.dividedBy(this.rwaPrice);
            
            totalRwaYield = totalRwaYield.plus(rwaYield);
        }
        
        // If no stakes found, fallback to total_staked calculation
        if (stakes.length === 0) {
            const totalStaked = new BigNumber(user.total_staked);
            const usdtYield = totalStaked.multipliedBy(currentYieldRate);
            const rwaYield = usdtYield.dividedBy(this.rwaPrice);
            return rwaYield.integerValue(BigNumber.ROUND_DOWN);
        }
        
        return totalRwaYield.integerValue(BigNumber.ROUND_DOWN);
    }
    
    /**
     * Calculate RWA yield for a single user (RWA staking)
     * @param userAddress User address
     * @param yieldRate Dynamic yield rate (based on pool health)
     */
    private async calculateRWAYield(userAddress: string, yieldRate?: number): Promise<BigNumber> {
        // Get all active RWA stakes for this user with lock periods
        const stakes = await query<Array<{ amount: string; lock_period: number }>>(
            `SELECT amount, lock_period
             FROM stakes
             WHERE user_address = ? AND asset_type = 'RWA' AND amount > 0
             ORDER BY timestamp DESC`,
            [userAddress]
        );
        
        const currentYieldRate = yieldRate !== undefined 
            ? new BigNumber(yieldRate)
            : new BigNumber(this.config.baseYieldRate);
        
        let totalRwaYield = new BigNumber(0);
        
        // Calculate yield for each stake based on its lock period
        // Note: For RWA staking, yield is calculated directly in RWA (not converted from USDT)
        for (const stake of stakes) {
            const stakeAmount = new BigNumber(stake.amount);
            const lockPeriod = stake.lock_period || 0;
            
            // Get lock period multiplier
            const lockMultiplier = this.getLockPeriodMultiplier(lockPeriod);
            
            // Calculate adjusted yield rate (base rate × lock multiplier)
            const adjustedYieldRate = currentYieldRate.multipliedBy(lockMultiplier);
            
            // Calculate RWA yield directly (stake amount × yield rate × multiplier)
            const rwaYield = stakeAmount.multipliedBy(adjustedYieldRate);
            
            totalRwaYield = totalRwaYield.plus(rwaYield);
        }
        
        // If no stakes found, fallback to total_staked_rwa calculation
        if (stakes.length === 0) {
            const rwaStakeInfo = await query<Array<{ total_staked_rwa: string }>>(
                `SELECT total_staked_rwa FROM rwa_stakes WHERE user_address = ?`,
                [userAddress]
            );
            
            if (rwaStakeInfo.length > 0) {
                const totalStakedRWA = new BigNumber(rwaStakeInfo[0].total_staked_rwa);
                const rwaYield = totalStakedRWA.multipliedBy(currentYieldRate);
                return rwaYield.integerValue(BigNumber.ROUND_DOWN);
            }
        }
        
        return totalRwaYield.integerValue(BigNumber.ROUND_DOWN);
    }
    
    /**
     * Get lock period multiplier
     * @param lockPeriod Lock period in days (0=flexible, 30, 90, 180, 365)
     * @returns Multiplier value
     */
    private getLockPeriodMultiplier(lockPeriod: number): number {
        switch (lockPeriod) {
            case 0: return 1.0;    // flexible
            case 30: return 1.3;   // 30 days
            case 90: return 1.6;   // 90 days
            case 180: return 2.0;  // 180 days
            case 365: return 2.5;  // 365 days
            default: return 1.0;   // default to flexible
        }
    }
    
    /**
     * Get current pool health status
     */
    async getPoolHealthStatus(): Promise<PoolHealthStatus> {
        return await this.calculatePoolHealth();
    }
    
    /**
     * Distribute yield to user (database only) - USDT staking
     */
    private async distributeYield(userAddress: string, yieldAmount: string, assetType: string = 'USDT'): Promise<void> {
        await transaction(async (connection) => {
            // Update user's rwaPending balance
            await connection.query(
                `UPDATE users
                 SET rwa_pending = rwa_pending + ?
                 WHERE address = ?`,
                [yieldAmount, userAddress]
            );
            
            // Record in rewards table
            await connection.query(
                `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
                 VALUES (?, 'static', 'RWA', ?, NOW())`,
                [userAddress, yieldAmount]
            );
        });
        
        logger.debug(`Distributed yield to ${userAddress} (${assetType}): ${yieldAmount} RWA`);
    }
    
    /**
     * Distribute RWA yield to user (database only) - RWA staking
     */
    private async distributeRWAYield(userAddress: string, yieldAmount: string): Promise<void> {
        await transaction(async (connection) => {
            // Update RWA stake user's rwaPending balance
            await connection.query(
                `UPDATE rwa_stakes
                 SET rwa_pending = rwa_pending + ?
                 WHERE user_address = ?`,
                [yieldAmount, userAddress]
            );
            
            // Record in rewards table
            await connection.query(
                `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
                 VALUES (?, 'static', 'RWA', ?, NOW())`,
                [userAddress, yieldAmount]
            );
        });
        
        logger.debug(`Distributed RWA yield to ${userAddress}: ${yieldAmount} RWA`);
    }
    
    /**
     * Update contract rewards
     * @param userAddress User address
     * @param rwaAmount RWA amount (as string)
     * @param isRWAStaking Whether this is RWA staking (true) or USDT staking (false)
     */
    private async updateContractRewards(userAddress: string, rwaAmount: string, isRWAStaking: boolean = false): Promise<void> {
        if (!this.stakingContract) {
            logger.warn('StakingContract not initialized, skipping contract update');
            return;
        }
        
        logger.debug(`Contract object exists: ${!!this.stakingContract}`);
        logger.debug(`Contract address: ${this.stakingContract.target}`);
        
        try {
            // Generate unique stakeId (use timestamp + random)
            const stakeId = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
            
            // rwaAmount is already in wei (BigNumber.toString()), no need to parseEther again
            const rwaAmountWei = BigInt(rwaAmount);
            
            // Call contract
            // For RWA staking, pass usdtAmount = 0 to indicate RWA staking reward
            // For USDT staking, pass usdtAmount = 0 (static rewards are RWA only)
            logger.info(`Updating contract rewards for ${userAddress} (${isRWAStaking ? 'RWA' : 'USDT'} staking): ${rwaAmount} RWA`);
            logger.info(`Calling updateUserRewards with params: user=${userAddress}, rwaAmount=${rwaAmountWei.toString()}, usdtAmount=0, stakeId=${stakeId}`);
            
            const tx = await Promise.race([
                this.stakingContract.updateUserRewards(
                    userAddress,
                    rwaAmountWei,
                    0, // usdtAmount = 0 indicates RWA staking reward or static RWA reward
                    stakeId
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout after 30s')), 30000))
            ]);
            
            logger.info(`Transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logger.info(`✅ Contract updated: ${userAddress}, tx=${tx.hash}`);
            } else {
                logger.error(`❌ Transaction failed: ${tx.hash}`);
                throw new Error(`Transaction failed: ${tx.hash}`);
            }
            
        } catch (error: any) {
            logger.error(`Failed to update contract rewards for ${userAddress}:`);
            logger.error('Error type:', error?.constructor?.name);
            logger.error('Error message:', error?.message);
            logger.error('Error code:', error?.code);
            logger.error('Error reason:', error?.reason);
            logger.error('Error data:', error?.data);
            if (error?.transaction) {
                logger.error('Transaction:', error.transaction);
            }
            // Don't throw - database update already succeeded
        }
    }
    
    /**
     * Get yield statistics
     */
    async getYieldStatistics(days: number = 30): Promise<{
        totalYield: string;
        averageDaily: string;
        userCount: number;
    }> {
        const result = await query<any[]>(
            `SELECT 
                COUNT(DISTINCT user_address) as user_count,
                SUM(amount) as total_yield,
                AVG(amount) as average_yield
             FROM rewards
             WHERE reward_type = 'static'
               AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );
        
        if (result.length === 0 || !result[0].total_yield) {
            return {
                totalYield: '0',
                averageDaily: '0',
                userCount: 0
            };
        }
        
        const totalYield = new BigNumber(result[0].total_yield || '0');
        const averageDaily = totalYield.dividedBy(days);
        
        return {
            totalYield: totalYield.toString(),
            averageDaily: averageDaily.toString(),
            userCount: result[0].user_count || 0
        };
    }
    
    /**
     * Get user's yield history
     */
    async getUserYieldHistory(
        userAddress: string,
        limit: number = 30
    ): Promise<Array<{
        amount: string;
        timestamp: Date;
    }>> {
        const results = await query<any[]>(
            `SELECT amount, timestamp
             FROM rewards
             WHERE user_address = ?
               AND reward_type = 'static'
               AND token_type = 'RWA'
             ORDER BY timestamp DESC
             LIMIT ?`,
            [userAddress, limit]
        );
        
        return results.map(r => ({
            amount: r.amount.toString(),
            timestamp: r.timestamp
        }));
    }
    
    /**
     * Estimate future yield
     * @param stakedAmount Staked amount (18-bit integer as string)
     * @param days Number of days
     * @param useCurrentHealth If true, use current pool health for yield rate
     */
    async estimateFutureYield(
        stakedAmount: string,
        days: number,
        useCurrentHealth: boolean = false
    ): Promise<string> {
        const staked = new BigNumber(stakedAmount);
        
        // Get yield rate (use current health if requested)
        let yieldRate = new BigNumber(this.config.baseYieldRate);
        if (useCurrentHealth) {
            const poolHealth = await this.calculatePoolHealth();
            yieldRate = new BigNumber(poolHealth.yieldRate);
        }
        
        const dailyYield = staked.multipliedBy(yieldRate);
        const totalYield = dailyYield.multipliedBy(days);
        
        // Convert to RWA
        const rwaYield = totalYield.dividedBy(this.rwaPrice);
        
        return rwaYield.integerValue(BigNumber.ROUND_DOWN).toString();
    }
}

export default DailyYieldService;
