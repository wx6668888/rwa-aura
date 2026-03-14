import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { query, transaction } from '../config/database.config';
import { NODE_REQUIREMENTS, User, NodeLevelHistory } from '../models/types';
import { TeamVolumeService } from './TeamVolumeService';
import logger from '../utils/logger';

/**
 * Node Level Service
 *
 * 等级考核：个人质押用「累计质押量」（cumulative_personal_stake），非当前质押量，避免提现后压级。
 *
 * 压级会在什么情况下出现？
 * - 改用累计量后：仅当「累计个人质押」或「团队量」未达到下一级要求时无法升级；用户提现不会导致压级。
 * - 若用当前量（旧逻辑）：用户提现后当前质押低于下一级要求时会被压级（无法升级）。
 *
 * CRITICAL FEATURES:
 * 1. Personal stake: cumulative (only increases on stake), not current balance
 * 2. Team volume requirement
 * 3. Updates both database and contract
 * 4. Records upgrade history
 */

export interface NodeLevelServiceConfig {
    stakingContractAddress: string;
    stakingContractABI: any[];
    provider: ethers.JsonRpcProvider;
    backendWallet: ethers.Wallet;
}

export class NodeLevelService {
    private config: NodeLevelServiceConfig;
    private stakingContract: ethers.Contract;
    private teamVolumeService: TeamVolumeService;
    
    constructor(config: NodeLevelServiceConfig) {
        this.config = config;
        this.stakingContract = new ethers.Contract(
            config.stakingContractAddress,
            config.stakingContractABI,
            config.backendWallet
        );
        this.teamVolumeService = new TeamVolumeService();
    }
    
    /**
     * Check and upgrade node level if requirements are met
     * 
     * @param userAddress User address
     * @returns true if upgraded, false otherwise
     */
    async checkAndUpgradeNodeLevel(userAddress: string): Promise<boolean> {
        logger.info(`Checking node level upgrade for ${userAddress}`);
        
        try {
            // Get current user info
            const user = await this.getUserInfo(userAddress);
            const currentLevel = user.node_level;
            
            // Check if user can upgrade to next level
            const nextLevel = currentLevel + 1;
            
            if (nextLevel > 9) {
                logger.info('User is already at max level (L9)');
                return false;
            }
            
            const requirement = NODE_REQUIREMENTS.find(r => r.level === nextLevel);
            if (!requirement) {
                logger.warn(`No requirement found for level ${nextLevel}`);
                return false;
            }
            
            // Check personal stake requirement (纯金额考核)
            const meetsPersonalStake = await this.checkPersonalStakeRequirement(
                userAddress,
                requirement.personalStakeUSDT
            );
            
            if (!meetsPersonalStake) {
                logger.info(`Personal stake requirement not met for L${nextLevel}: required=${requirement.personalStakeUSDT}`);
                return false;
            }
            
            // Check team volume requirement (纯金额考核)
            const meetsTeamVolume = await this.checkTeamVolumeRequirement(
                userAddress,
                requirement.teamVolumeUSDT
            );
            
            if (!meetsTeamVolume) {
                logger.info(`Team volume requirement not met for L${nextLevel}: required=${requirement.teamVolumeUSDT}`);
                return false;
            }
            
            // Check team retained requirement (总留存 = 团队充值 - 团队提现，USDT 等值)
            const meetsTeamRetained = await this.checkTeamRetainedRequirement(
                userAddress,
                requirement.teamRetainedUSDT
            );
            if (!meetsTeamRetained) {
                logger.info(`Team retained requirement not met for L${nextLevel}: required=${requirement.teamRetainedUSDT}`);
                return false;
            }
            
            // All requirements met, upgrade user
            await this.upgradeUser(userAddress, currentLevel, nextLevel);
            
            logger.info(`✅ User upgraded: ${userAddress} L${currentLevel} -> L${nextLevel}`);
            
            return true;
            
        } catch (error) {
            logger.error('Failed to check/upgrade node level:', error);
            throw error;
        }
    }
    
    /**
     * Check team volume requirement (纯金额考核)
     * 团队量 = 团队下属业绩(team_volume) + 个人累计质押(cumulative_personal_stake)，即个人质押也计入团队
     */
    private async checkTeamVolumeRequirement(
        userAddress: string,
        requiredVolumeUSDT: string
    ): Promise<boolean> {
        const user = await this.getUserInfo(userAddress);
        const teamOnly = new BigNumber(await this.teamVolumeService.getTeamVolume(userAddress));
        const personalCumulative = new BigNumber(user.cumulative_personal_stake || '0');
        const actualVolume = teamOnly.plus(personalCumulative);
        const requiredBN = new BigNumber(requiredVolumeUSDT);
        const meets = actualVolume.isGreaterThanOrEqualTo(requiredBN);

        logger.info(`Team volume check (team+personal): user=${userAddress}, required=${requiredVolumeUSDT} USDT, team=${teamOnly.toString()}, personal=${personalCumulative.toString()}, total=${actualVolume.toString()}, result=${meets}`);

        return meets;
    }

    /**
     * Check team retained requirement (总留存 = 团队所有充值 - 团队所有提现，USDT 等值)
     */
    private async checkTeamRetainedRequirement(
        userAddress: string,
        requiredRetainedUSDT: string
    ): Promise<boolean> {
        const retained = await this.teamVolumeService.getTeamRetained(userAddress);
        const retainedBN = new BigNumber(retained);
        const requiredBN = new BigNumber(requiredRetainedUSDT);
        const meets = retainedBN.isGreaterThanOrEqualTo(requiredBN);
        logger.info(`Team retained check: user=${userAddress}, retained=${retained}, required=${requiredRetainedUSDT}, result=${meets}`);
        return meets;
    }
    
    /**
     * Check personal stake requirement (纯金额考核)
     * 使用累计质押量（cumulative_personal_stake），非当前质押量，避免提现后压级
     */
    private async checkPersonalStakeRequirement(
        userAddress: string,
        requiredPersonalStakeUSDT: string
    ): Promise<boolean> {
        if (requiredPersonalStakeUSDT === '0') {
            return true; // No requirement
        }
        
        const user = await this.getUserInfo(userAddress);
        const cumulative = new BigNumber(user.cumulative_personal_stake || '0');
        const requiredBN = new BigNumber(requiredPersonalStakeUSDT);
        const meets = cumulative.isGreaterThanOrEqualTo(requiredBN);
        
        logger.info(`Personal stake check (cumulative): user=${userAddress}, required=${requiredPersonalStakeUSDT}, cumulative=${cumulative.toString()}, result=${meets}`);
        
        return meets;
    }
    
    /**
     * Check minimum departments requirement (已废弃，仅保留用于兼容)
     */
    private async checkMinDepartmentsRequirement(
        userAddress: string,
        minDepartments: number
    ): Promise<boolean> {
        if (minDepartments === 0) {
            return true; // No requirement
        }
        
        // Count distinct direct referrals (each is a department)
        const result = await query<any[]>(
            `SELECT COUNT(DISTINCT user_address) as count
             FROM referral_bindings
             WHERE referrer = ?`,
            [userAddress.toLowerCase()]
        );
        
        const actualCount = result[0]?.count || 0;
        const meets = actualCount >= minDepartments;
        
        logger.info(`Min departments check: user=${userAddress}, required=${minDepartments}, actual=${actualCount}, result=${meets}`);
        
        return meets;
    }
    
    /**
     * Check department balance requirement (large/small department)
     * 
     * For V2+, max single department volume must be <= 50% of total team volume
     */
    private async checkDepartmentBalanceRequirement(
        userAddress: string,
        maxAllowedRatio: number
    ): Promise<boolean> {
        return await this.teamVolumeService.checkDepartmentBalance(
            userAddress,
            maxAllowedRatio
        );
    }
    
    /**
     * Upgrade user to new level
     * 
     * Updates both database and contract
     */
    private async upgradeUser(
        userAddress: string,
        oldLevel: number,
        newLevel: number
    ): Promise<void> {
        logger.info(`Upgrading user: ${userAddress} L${oldLevel} -> L${newLevel}`);
        
        try {
            await transaction(async (connection) => {
                // Get current team volume and direct V count
                const [users] = await connection.query(
                    'SELECT team_volume FROM users WHERE address = ?',
                    [userAddress.toLowerCase()]
                );
                
                const userRows = users as { team_volume: number }[];
                const teamVolume = userRows[0]?.team_volume ?? 0;
                
                // Count departments (direct referrals)
                const [departmentCount] = await connection.query(
                    `SELECT COUNT(DISTINCT user_address) as count
                     FROM referral_bindings
                     WHERE referrer = ?`,
                    [userAddress.toLowerCase()]
                );
                
                // Update user's node level in database
                await connection.query(
                    'UPDATE users SET node_level = ? WHERE address = ?',
                    [newLevel, userAddress.toLowerCase()]
                );
                
                // Record upgrade history
                const deptRows = departmentCount as { count: number }[];
                const directVCount = deptRows[0]?.count ?? 0;
                await connection.query(
                    `INSERT INTO node_level_history (user_address, old_level, new_level, team_volume, direct_v_count, timestamp)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [userAddress.toLowerCase(), oldLevel, newLevel, teamVolume, directVCount]
                );
                
                logger.info('Database updated successfully');
            });
            
            // Update contract (sync on-chain state)
            await this.updateContractNodeLevel(userAddress, newLevel);
            
            logger.info('Contract updated successfully');
            
        } catch (error) {
            logger.error('Failed to upgrade user:', error);
            throw error;
        }
    }
    
    /**
     * Update node level on contract
     */
    private async updateContractNodeLevel(
        userAddress: string,
        newLevel: number
    ): Promise<void> {
        try {
            const tx = await this.stakingContract.updateNodeLevel(
                userAddress,
                newLevel
            );
            
            logger.info(`Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logger.info(`✅ Contract updated: ${userAddress} -> L${newLevel}, tx=${tx.hash}`);
            } else {
                logger.error(`❌ Transaction failed: ${tx.hash}`);
                throw new Error(`Transaction failed: ${tx.hash}`);
            }
            
        } catch (error) {
            logger.error('Failed to update contract node level:', error);
            throw error;
        }
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
     * Get user's upgrade history
     */
    async getUpgradeHistory(userAddress: string): Promise<NodeLevelHistory[]> {
        const history = await query<NodeLevelHistory[]>(
            'SELECT * FROM node_level_history WHERE user_address = ? ORDER BY timestamp DESC',
            [userAddress.toLowerCase()]
        );
        
        return history;
    }
    
    /**
     * Sync node level from contract to database
     * 
     * Used for periodic synchronization to ensure consistency
     */
    async syncNodeLevelFromContract(userAddress: string): Promise<void> {
        try {
            // Get level from contract
            const [, , , , , onChainLevel] = await this.stakingContract.getUserStakeInfo(userAddress);
            
            // Get level from database
            const user = await this.getUserInfo(userAddress);
            const dbLevel = user.node_level;
            
            if (onChainLevel !== dbLevel) {
                logger.warn(`Level mismatch for ${userAddress}: DB=${dbLevel}, Chain=${onChainLevel}`);
                
                // Update database to match contract (contract is source of truth)
                await query(
                    'UPDATE users SET node_level = ? WHERE address = ?',
                    [onChainLevel, userAddress.toLowerCase()]
                );
                
                logger.info(`✅ Node level synced: ${userAddress} -> V${onChainLevel}`);
            }
            
        } catch (error) {
            logger.error('Failed to sync node level:', error);
            throw error;
        }
    }
}

export default NodeLevelService;
