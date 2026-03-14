import BigNumber from 'bignumber.js';
import { query, transaction } from '../config/database.config';
import { User, DepartmentVolume } from '../models/types';
import logger from '../utils/logger';

/**
 * Team Volume Service
 * 
 * Handles incremental team volume updates
 * 
 * CRITICAL FEATURES:
 * 1. Incremental updates (not full recalculation)
 * 2. Updates all ancestors using referral_relations table
 * 3. Updates department_volumes for large/small department calculation
 * 4. Uses database transactions for atomicity
 * 5. Uses stored procedure for performance
 */

export class TeamVolumeService {
    /**
     * Update team volume for a user and all ancestors
     * 
     * @param userAddress User address
     * @param incrementAmount Amount to add (18-bit integer as string)
     */
    async updateTeamVolume(
        userAddress: string,
        incrementAmount: string
    ): Promise<void> {
        logger.info(`Updating team volume: user=${userAddress}, increment=${incrementAmount}`);
        
        try {
            await transaction(async (connection) => {
                // Use stored procedure for efficient update
                await connection.query(
                    'CALL sp_update_team_volume(?, ?)',
                    [userAddress.toLowerCase(), incrementAmount]
                );
                
                // Update department volumes
                await this.updateDepartmentVolumes(connection, userAddress.toLowerCase(), incrementAmount);
            });
            
            logger.info(`✅ Team volume updated for ${userAddress}`);
            
        } catch (error) {
            logger.error('Failed to update team volume:', error);
            throw error;
        }
    }
    
    /**
     * Update department volumes for large/small department calculation
     * 
     * For each ancestor, track how much volume comes from each direct referral branch
     */
    private async updateDepartmentVolumes(
        connection: any,
        userAddress: string,
        incrementAmount: string
    ): Promise<void> {
        // Get user's referrer
        const [users] = await connection.query(
            'SELECT referrer FROM users WHERE address = ?',
            [userAddress]
        );
        
        if (users.length === 0 || !users[0].referrer) {
            // No referrer, no department volumes to update
            return;
        }
        
        const referrer = users[0].referrer;
        
        // Get all ancestors of the referrer
        const [ancestors] = await connection.query(
            `SELECT ancestor_address FROM referral_relations 
             WHERE user_address = ? 
             ORDER BY depth ASC`,
            [referrer]
        );
        
        // For each ancestor, update the department volume for this referrer's branch
        const ancestorsToUpdate = [referrer, ...ancestors.map((a: any) => a.ancestor_address)];
        
        for (const ancestor of ancestorsToUpdate) {
            // Insert or update department volume
            await connection.query(
                `INSERT INTO department_volumes (user_address, direct_referral, department_volume)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE department_volume = department_volume + VALUES(department_volume)`,
                [ancestor, referrer, incrementAmount]
            );
        }
        
        logger.info(`Department volumes updated for ${ancestorsToUpdate.length} ancestors`);
    }
    
    /**
     * Update team total deposited (总留存：所有充值计入，USDT 等值)
     */
    async updateTeamDeposited(userAddress: string, amountUsdtEquiv: string): Promise<void> {
        try {
            await transaction(async (connection) => {
                await connection.query('CALL sp_update_team_deposited(?, ?)', [userAddress.toLowerCase(), amountUsdtEquiv]);
            });
            logger.info(`✅ Team deposited updated for ${userAddress}, +${amountUsdtEquiv}`);
        } catch (error) {
            logger.error('Failed to update team deposited:', error);
            throw error;
        }
    }

    /**
     * Update team total withdrawn (总留存：所有提现计入，USDT 等值)
     */
    async updateTeamWithdrawn(userAddress: string, amountUsdtEquiv: string): Promise<void> {
        try {
            await transaction(async (connection) => {
                await connection.query('CALL sp_update_team_withdrawn(?, ?)', [userAddress.toLowerCase(), amountUsdtEquiv]);
            });
            logger.info(`✅ Team withdrawn updated for ${userAddress}, +${amountUsdtEquiv}`);
        } catch (error) {
            logger.error('Failed to update team withdrawn:', error);
            throw error;
        }
    }

    /**
     * Get team retained (deposited - withdrawn) in USDT equiv, 18-dec string
     * 包含自己的充值和提现
     */
    async getTeamRetained(userAddress: string): Promise<string> {
        const users = await query<User[]>(
            `SELECT 
                COALESCE(team_total_deposited, 0) AS team_d, 
                COALESCE(team_total_withdrawn, 0) AS team_w,
                COALESCE(cumulative_personal_stake, 0) AS personal_d
             FROM users WHERE address = ?`,
            [userAddress.toLowerCase()]
        );
        if (users.length === 0) return '0';
        
        // 计算个人USDT提现（已经是18位精度）
        const usdtWithdrawals = await query(
            `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(65,0))), 0) AS total 
             FROM withdrawal_events 
             WHERE user_address = ? AND event_type LIKE '%USDT%'`,
            [userAddress.toLowerCase()]
        );
        
        // 计算个人RWA提现转USDT等值（已经是18位精度，×0.85）
        const rwaWithdrawals = await query(
            `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(65,0)) * 85 / 100), 0) AS total 
             FROM withdrawal_events 
             WHERE user_address = ? AND event_type LIKE '%RWA%'`,
            [userAddress.toLowerCase()]
        );
        
        const teamD = new BigNumber((users[0] as any).team_d?.toString() ?? '0');
        const teamW = new BigNumber((users[0] as any).team_w?.toString() ?? '0');
        const personalD = new BigNumber((users[0] as any).personal_d?.toString() ?? '0');
        const personalW = new BigNumber((usdtWithdrawals[0] as any).total?.toString() ?? '0')
            .plus(new BigNumber((rwaWithdrawals[0] as any).total?.toString() ?? '0'));
        
        const totalRetained = teamD.plus(personalD).minus(teamW).minus(personalW);
        return totalRetained.isLessThan(0) ? '0' : totalRetained.toFixed(0);
    }

    /**
     * Get user's team volume
     */
    async getTeamVolume(userAddress: string): Promise<string> {
        const users = await query<User[]>(
            'SELECT team_volume FROM users WHERE address = ?',
            [userAddress.toLowerCase()]
        );
        
        if (users.length === 0) {
            return '0';
        }
        
        return users[0].team_volume;
    }
    
    /**
     * Get user's department volumes
     */
    async getDepartmentVolumes(userAddress: string): Promise<DepartmentVolume[]> {
        const volumes = await query<DepartmentVolume[]>(
            'SELECT * FROM department_volumes WHERE user_address = ? ORDER BY department_volume DESC',
            [userAddress.toLowerCase()]
        );
        
        return volumes;
    }
    
    /**
     * Get max department volume ratio
     * 
     * Used for large/small department balance check
     */
    async getMaxDepartmentRatio(userAddress: string): Promise<number> {
        const teamVolume = await this.getTeamVolume(userAddress);
        const teamVolumeBN = new BigNumber(teamVolume);
        
        if (teamVolumeBN.isZero()) {
            return 0;
        }
        
        const volumes = await this.getDepartmentVolumes(userAddress);
        
        if (volumes.length === 0) {
            return 0;
        }
        
        // Get max department volume
        const maxDepartmentVolume = new BigNumber(volumes[0].department_volume);
        
        // Calculate ratio
        const ratio = maxDepartmentVolume.dividedBy(teamVolumeBN).toNumber();
        
        return ratio;
    }
    
    /**
     * Check if user meets large/small department balance requirement
     * 
     * For V2+, max single department volume must be <= 50% of total team volume
     */
    async checkDepartmentBalance(
        userAddress: string,
        maxAllowedRatio: number
    ): Promise<boolean> {
        const actualRatio = await this.getMaxDepartmentRatio(userAddress);
        
        const meetsRequirement = actualRatio <= maxAllowedRatio;
        
        logger.info(`Department balance check: user=${userAddress}, ratio=${actualRatio}, required=<=${maxAllowedRatio}, result=${meetsRequirement}`);
        
        return meetsRequirement;
    }
}

export default TeamVolumeService;
