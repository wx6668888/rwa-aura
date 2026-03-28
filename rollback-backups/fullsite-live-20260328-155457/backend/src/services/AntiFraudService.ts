import { query, transaction } from '../config/database.config';
import logger from '../utils/logger';
import BigNumber from 'bignumber.js';

/**
 * Anti-Fraud Service
 * 
 * Implements fraud detection mechanisms to prevent fake accounts and referral abuse
 * 
 * FEATURES:
 * 1. Small account detection (suspicious users)
 * 2. IP/Device fingerprint detection
 * 3. Referral quality analysis
 * 4. Time window restrictions
 * 5. Quality score calculation
 */

export interface SuspiciousUser {
    address: string;
    reasons: string[];
    riskScore: number;
    qualityScore: number;
}

export interface QualityScore {
    address: string;
    totalScore: number;
    validDirectReferralRate: number; // 有效直推率
    averageStake: number; // 团队平均质押
    activeRate: number; // 活跃率
    ipRisk: number; // IP风险
    deviceRisk: number; // 设备风险
}

export interface AntiFraudConfig {
    minStakeAmount: string; // 最低质押金额（18-bit integer as string）
    maxUsersPerIP: number; // 同一IP最大用户数
    maxUsersPerDevice: number; // 同一设备最大用户数
    minStakeInterval: number; // 最小质押间隔（秒）
    maxReferralsPer24h: number; // 24小时内最大推荐数
    minValidDirectReferralRate: number; // 最低有效直推率（0.5 = 50%）
    minAverageStake: string; // 最低团队平均质押（18-bit integer as string）
    minActiveRate: number; // 最低活跃率（0.5 = 50%）
    minQualityScore: number; // 最低质量分数
}

export class AntiFraudService {
    private config: AntiFraudConfig;
    
    constructor(config?: Partial<AntiFraudConfig>) {
        this.config = {
            minStakeAmount: config?.minStakeAmount || '100000000000000000000', // 100 USDT (18 decimals)
            maxUsersPerIP: config?.maxUsersPerIP || 3,
            maxUsersPerDevice: config?.maxUsersPerDevice || 1,
            minStakeInterval: config?.minStakeInterval || 86400, // 1 day
            maxReferralsPer24h: config?.maxReferralsPer24h || 10,
            minValidDirectReferralRate: config?.minValidDirectReferralRate || 0.5, // 50%
            minAverageStake: config?.minAverageStake || '200000000000000000000', // 200 USDT
            minActiveRate: config?.minActiveRate || 0.5, // 50%
            minQualityScore: config?.minQualityScore || 50
        };
    }
    
    /**
     * Detect suspicious users
     * @returns Array of suspicious users with reasons
     */
    async detectSuspiciousUsers(): Promise<SuspiciousUser[]> {
        logger.info('Detecting suspicious users...');
        
        try {
            const suspiciousUsers: SuspiciousUser[] = [];
            
            // 1. Check users with low stake amounts
            const lowStakeUsers = await this.getLowStakeUsers();
            for (const user of lowStakeUsers) {
                suspiciousUsers.push({
                    address: user.address,
                    reasons: ['Low stake amount'],
                    riskScore: 30,
                    qualityScore: user.qualityScore || 0
                });
            }
            
            // 2. Check IP violations
            const ipViolations = await this.getIPViolations();
            for (const violation of ipViolations) {
                const existing = suspiciousUsers.find(u => u.address === violation.address);
                if (existing) {
                    existing.reasons.push(`IP violation: ${violation.ip} (${violation.userCount} users)`);
                    existing.riskScore += 40;
                } else {
                    suspiciousUsers.push({
                        address: violation.address,
                        reasons: [`IP violation: ${violation.ip} (${violation.userCount} users)`],
                        riskScore: 40,
                        qualityScore: 0
                    });
                }
            }
            
            // 3. Check device violations
            const deviceViolations = await this.getDeviceViolations();
            for (const violation of deviceViolations) {
                const existing = suspiciousUsers.find(u => u.address === violation.address);
                if (existing) {
                    existing.reasons.push(`Device violation: ${violation.deviceFingerprint}`);
                    existing.riskScore += 50;
                } else {
                    suspiciousUsers.push({
                        address: violation.address,
                        reasons: [`Device violation: ${violation.deviceFingerprint}`],
                        riskScore: 50,
                        qualityScore: 0
                    });
                }
            }
            
            // 4. Check time window violations
            const timeViolations = await this.getTimeWindowViolations();
            for (const violation of timeViolations) {
                const existing = suspiciousUsers.find(u => u.address === violation.address);
                if (existing) {
                    existing.reasons.push(violation.reason);
                    existing.riskScore += 20;
                } else {
                    suspiciousUsers.push({
                        address: violation.address,
                        reasons: [violation.reason],
                        riskScore: 20,
                        qualityScore: 0
                    });
                }
            }
            
            // 5. Check quality score violations
            const qualityViolations = await this.getQualityScoreViolations();
            for (const violation of qualityViolations) {
                const existing = suspiciousUsers.find(u => u.address === violation.address);
                if (existing) {
                    existing.reasons.push(`Low quality score: ${violation.qualityScore}`);
                    existing.riskScore += 30;
                    existing.qualityScore = violation.qualityScore;
                } else {
                    suspiciousUsers.push({
                        address: violation.address,
                        reasons: [`Low quality score: ${violation.qualityScore}`],
                        riskScore: 30,
                        qualityScore: violation.qualityScore
                    });
                }
            }
            
            logger.info(`Detected ${suspiciousUsers.length} suspicious users`);
            return suspiciousUsers;
            
        } catch (error) {
            logger.error('Error detecting suspicious users:', error);
            throw error;
        }
    }
    
    /**
     * Check IP limit
     * @param ip IP address
     * @returns true if IP is within limit
     */
    async checkIPLimit(ip: string): Promise<boolean> {
        try {
            const result = await query<{ userCount: number }[]>(
                `SELECT COUNT(DISTINCT user_address) as userCount
                 FROM user_sessions
                 WHERE ip_address = ? 
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [ip]
            );
            
            const userCount = result[0]?.userCount || 0;
            return userCount < this.config.maxUsersPerIP;
            
        } catch (error) {
            logger.error('Error checking IP limit:', error);
            return false; // Fail closed
        }
    }
    
    /**
     * Check device fingerprint limit
     * @param fingerprint Device fingerprint
     * @returns true if device is within limit
     */
    async checkDeviceFingerprint(fingerprint: string): Promise<boolean> {
        try {
            const result = await query<{ userCount: number }[]>(
                `SELECT COUNT(DISTINCT user_address) as userCount
                 FROM user_sessions
                 WHERE device_fingerprint = ? 
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [fingerprint]
            );
            
            const userCount = result[0]?.userCount || 0;
            return userCount < this.config.maxUsersPerDevice;
            
        } catch (error) {
            logger.error('Error checking device fingerprint:', error);
            return false; // Fail closed
        }
    }
    
    /**
     * Analyze referral quality for a user
     * @param userAddress User address
     * @returns Quality score
     */
    async analyzeReferralQuality(userAddress: string): Promise<QualityScore> {
        logger.info(`Analyzing referral quality for user=${userAddress}`);
        
        try {
            // 1. Get direct referrals
            const directReferrals = await query<{ address: string; total_staked: string; is_active: boolean }[]>(
                `SELECT address, total_staked, is_active
                 FROM users
                 WHERE referrer = ?`,
                [userAddress]
            );
            
            // 2. Calculate valid direct referral rate
            const validDirectReferrals = directReferrals.filter(u => {
                const stakeAmount = new BigNumber(u.total_staked);
                const minStake = new BigNumber(this.config.minStakeAmount);
                return stakeAmount.gte(minStake) && u.is_active;
            });
            
            const validDirectReferralRate = directReferrals.length > 0
                ? validDirectReferrals.length / directReferrals.length
                : 0;
            
            // 3. Calculate average stake
            let averageStake = 0;
            if (directReferrals.length > 0) {
                const totalStake = directReferrals.reduce((sum, u) => {
                    return sum.plus(new BigNumber(u.total_staked));
                }, new BigNumber(0));
                averageStake = totalStake.dividedBy(directReferrals.length).toNumber();
            }
            
            // 4. Calculate active rate
            const activeReferrals = directReferrals.filter(u => u.is_active);
            const activeRate = directReferrals.length > 0
                ? activeReferrals.length / directReferrals.length
                : 0;
            
            // 5. Check IP risk
            const ipRisk = await this.getIPRisk(userAddress);
            
            // 6. Check device risk
            const deviceRisk = await this.getDeviceRisk(userAddress);
            
            // 7. Calculate total quality score
            let totalScore = 0;
            
            // Valid direct referral rate (0-30 points)
            if (validDirectReferralRate >= this.config.minValidDirectReferralRate) {
                totalScore += 30;
            } else {
                totalScore += validDirectReferralRate * 60; // Scale to 30 points
            }
            
            // Average stake (0-30 points)
            const minStakeBN = new BigNumber(this.config.minAverageStake);
            if (averageStake >= minStakeBN.toNumber()) {
                totalScore += 30;
            } else {
                totalScore += (averageStake / minStakeBN.toNumber()) * 30;
            }
            
            // Active rate (0-20 points)
            if (activeRate >= this.config.minActiveRate) {
                totalScore += 20;
            } else {
                totalScore += activeRate * 40; // Scale to 20 points
            }
            
            // IP risk (0-10 points, lower risk = higher score)
            totalScore += (1 - ipRisk) * 10;
            
            // Device risk (0-10 points, lower risk = higher score)
            totalScore += (1 - deviceRisk) * 10;
            
            return {
                address: userAddress,
                totalScore: Math.round(totalScore),
                validDirectReferralRate,
                averageStake,
                activeRate,
                ipRisk,
                deviceRisk
            };
            
        } catch (error) {
            logger.error(`Error analyzing referral quality for ${userAddress}:`, error);
            throw error;
        }
    }
    
    /**
     * Record user session (IP and device fingerprint)
     * @param userAddress User address
     * @param ip IP address
     * @param deviceFingerprint Device fingerprint
     */
    async recordUserSession(
        userAddress: string,
        ip: string,
        deviceFingerprint: string
    ): Promise<void> {
        try {
            await query(
                `INSERT INTO user_sessions (user_address, ip_address, device_fingerprint, created_at)
                 VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE 
                     ip_address = VALUES(ip_address),
                     device_fingerprint = VALUES(device_fingerprint),
                     updated_at = NOW()`,
                [userAddress, ip, deviceFingerprint]
            );
            
            logger.debug(`Recorded session for user=${userAddress}, ip=${ip}`);
            
        } catch (error) {
            logger.error('Error recording user session:', error);
            // Don't throw - session recording is not critical
        }
    }
    
    /**
     * Check if user can stake (time window check)
     * @param userAddress User address
     * @returns true if user can stake
     */
    async canUserStake(userAddress: string): Promise<boolean> {
        try {
            // Check minimum stake interval
            const lastStake = await query<{ timestamp: Date }[]>(
                `SELECT MAX(timestamp) as timestamp
                 FROM stakes
                 WHERE user_address = ?`,
                [userAddress]
            );
            
            if (lastStake.length > 0 && lastStake[0].timestamp) {
                const lastStakeTime = new Date(lastStake[0].timestamp).getTime();
                const now = Date.now();
                const interval = (now - lastStakeTime) / 1000; // seconds
                
                if (interval < this.config.minStakeInterval) {
                    return false;
                }
            }
            
            return true;
            
        } catch (error) {
            logger.error('Error checking if user can stake:', error);
            return false; // Fail closed
        }
    }
    
    /**
     * Check if user can refer (24h limit check)
     * @param referrerAddress Referrer address
     * @returns true if user can refer
     */
    async canUserRefer(referrerAddress: string): Promise<boolean> {
        try {
            const referrals24h = await query<{ count: number }[]>(
                `SELECT COUNT(*) as count
                 FROM users
                 WHERE referrer = ?
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [referrerAddress]
            );
            
            const count = referrals24h[0]?.count || 0;
            return count < this.config.maxReferralsPer24h;
            
        } catch (error) {
            logger.error('Error checking if user can refer:', error);
            return false; // Fail closed
        }
    }
    
    // ========== Private Helper Methods ==========
    
    private async getLowStakeUsers(): Promise<{ address: string; qualityScore: number }[]> {
        const minStakeBN = new BigNumber(this.config.minStakeAmount);
        
        const users = await query<{ address: string; total_staked: string }[]>(
            `SELECT address, total_staked
             FROM users
             WHERE total_staked < ?`,
            [this.config.minStakeAmount]
        );
        
        const result = [];
        for (const user of users) {
            const qualityScore = await this.analyzeReferralQuality(user.address);
            result.push({
                address: user.address,
                qualityScore: qualityScore.totalScore
            });
        }
        
        return result;
    }
    
    private async getIPViolations(): Promise<{ address: string; ip: string; userCount: number }[]> {
        const violations = await query<{ ip_address: string; userCount: number; user_address: string }[]>(
            `SELECT ip_address, COUNT(DISTINCT user_address) as userCount, user_address
             FROM user_sessions
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY ip_address
             HAVING userCount > ?`,
            [this.config.maxUsersPerIP]
        );
        
        return violations.map(v => ({
            address: v.user_address,
            ip: v.ip_address,
            userCount: v.userCount
        }));
    }
    
    private async getDeviceViolations(): Promise<{ address: string; deviceFingerprint: string }[]> {
        const violations = await query<{ device_fingerprint: string; user_address: string }[]>(
            `SELECT device_fingerprint, user_address
             FROM user_sessions
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY device_fingerprint
             HAVING COUNT(DISTINCT user_address) > ?`,
            [this.config.maxUsersPerDevice]
        );
        
        return violations.map(v => ({
            address: v.user_address,
            deviceFingerprint: v.device_fingerprint
        }));
    }
    
    private async getTimeWindowViolations(): Promise<{ address: string; reason: string }[]> {
        const violations: { address: string; reason: string }[] = [];
        
        // Check stake interval violations
        const stakeViolations = await query<{ user_address: string; last_stake: Date; current_stake: Date }[]>(
            `SELECT s1.user_address, s1.timestamp as current_stake, s2.timestamp as last_stake
             FROM stakes s1
             JOIN (
                 SELECT user_address, MAX(timestamp) as timestamp
                 FROM stakes
                 GROUP BY user_address
             ) s2 ON s1.user_address = s2.user_address
             WHERE TIMESTAMPDIFF(SECOND, s2.timestamp, s1.timestamp) < ?`,
            [this.config.minStakeInterval]
        );
        
        for (const v of stakeViolations) {
            violations.push({
                address: v.user_address,
                reason: `Stake interval violation: less than ${this.config.minStakeInterval / 3600} hours`
            });
        }
        
        // Check 24h referral limit violations
        const referralViolations = await query<{ referrer: string; count: number }[]>(
            `SELECT referrer, COUNT(*) as count
             FROM users
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY referrer
             HAVING count > ?`,
            [this.config.maxReferralsPer24h]
        );
        
        for (const v of referralViolations) {
            violations.push({
                address: v.referrer,
                reason: `24h referral limit violation: ${v.count} referrals in 24h`
            });
        }
        
        return violations;
    }
    
    private async getQualityScoreViolations(): Promise<{ address: string; qualityScore: number }[]> {
        // Get all users with referrals
        const users = await query<{ address: string }[]>(
            `SELECT DISTINCT address
             FROM users
             WHERE address IN (SELECT DISTINCT referrer FROM users WHERE referrer IS NOT NULL)`
        );
        
        const violations = [];
        for (const user of users) {
            const qualityScore = await this.analyzeReferralQuality(user.address);
            if (qualityScore.totalScore < this.config.minQualityScore) {
                violations.push({
                    address: user.address,
                    qualityScore: qualityScore.totalScore
                });
            }
        }
        
        return violations;
    }
    
    private async getIPRisk(userAddress: string): Promise<number> {
        try {
            const result = await query<{ userCount: number }[]>(
                `SELECT COUNT(DISTINCT user_address) as userCount
                 FROM user_sessions
                 WHERE ip_address IN (
                     SELECT ip_address
                     FROM user_sessions
                     WHERE user_address = ?
                 )
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [userAddress]
            );
            
            const userCount = result[0]?.userCount || 1;
            // Risk score: 0 (no risk) to 1 (high risk)
            return Math.min(userCount / this.config.maxUsersPerIP, 1);
            
        } catch (error) {
            logger.error('Error getting IP risk:', error);
            return 0.5; // Default medium risk
        }
    }
    
    private async getDeviceRisk(userAddress: string): Promise<number> {
        try {
            const result = await query<{ userCount: number }[]>(
                `SELECT COUNT(DISTINCT user_address) as userCount
                 FROM user_sessions
                 WHERE device_fingerprint IN (
                     SELECT device_fingerprint
                     FROM user_sessions
                     WHERE user_address = ?
                 )
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [userAddress]
            );
            
            const userCount = result[0]?.userCount || 1;
            // Risk score: 0 (no risk) to 1 (high risk)
            return Math.min(userCount / this.config.maxUsersPerDevice, 1);
            
        } catch (error) {
            logger.error('Error getting device risk:', error);
            return 0.5; // Default medium risk
        }
    }
}
