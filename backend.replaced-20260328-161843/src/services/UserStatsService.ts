// backend/src/services/UserStatsService.ts
// [Logic Memory] 用户统计数据实时更新服务
// 负责在链上事件发生时同步更新 user_stats 表

import { query, transaction } from '../config/database.config';
import logger from '../utils/logger';

export class UserStatsService {
  /**
   * 更新用户个人质押数据
   * @param userAddress 用户地址
   * @param amount 质押金额（wei）
   * @param assetType 资产类型（USDT/RWA）
   */
  async updatePersonalStake(
    userAddress: string,
    amount: bigint,
    assetType: 'USDT' | 'RWA'
  ): Promise<void> {
    try {
      const amountStr = amount.toString();
      const field = assetType === 'USDT' ? 'personal_usdt_staked' : 'personal_rwa_staked';
      
      // 1. 更新或插入个人质押数据
      await query(
        `INSERT INTO user_stats (user_address, ${field}, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           ${field} = ${field} + ?,
           updated_at = NOW()`,
        [userAddress.toLowerCase(), amountStr, amountStr]
      );
      
      // 2. 重新计算 personal_total_usdt（USDT等值）
      const rwaPrice = 0.85; // 1 RWA = 0.85 USDT
      await query(
        `UPDATE user_stats 
         SET personal_total_usdt = (
           CAST(personal_usdt_staked AS DECIMAL(38,0)) + 
           CAST(personal_rwa_staked AS DECIMAL(38,0)) * ${rwaPrice}
         ) / 1e18
         WHERE LOWER(user_address) = LOWER(?)`,
        [userAddress]
      );
      
      logger.info(`[UserStatsService] Updated personal stake: ${userAddress}, ${assetType}, ${amount}`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed to update personal stake: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新团队数据（递归更新所有上级）
   * @param userAddress 用户地址
   * @param amountUsdt 质押金额（USDT等值）
   */
  async updateTeamVolume(userAddress: string, amountUsdt: number): Promise<void> {
    try {
      // 1. 获取所有上级（使用 referral_relations 表）
      const ancestors = await query<any[]>(
        `SELECT DISTINCT ancestor_address 
         FROM referral_relations 
         WHERE LOWER(user_address) = LOWER(?)`,
        [userAddress]
      );
      
      if (ancestors.length === 0) {
        logger.info(`[UserStatsService] No ancestors for ${userAddress}`);
        return;
      }
      
      // 2. 更新所有上级的团队业绩
      for (const ancestor of ancestors) {
        await query(
          `INSERT INTO user_stats (user_address, team_volume_usdt, updated_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             team_volume_usdt = team_volume_usdt + ?,
             updated_at = NOW()`,
          [ancestor.ancestor_address.toLowerCase(), amountUsdt, amountUsdt]
        );
      }
      
      logger.info(`[UserStatsService] Updated team volume for ${ancestors.length} ancestors`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed to update team volume: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新直推人数
   * @param referrerAddress 推荐人地址
   */
  async updateDirectReferrals(referrerAddress: string): Promise<void> {
    try {
      // 统计直推人数
      const result = await query<any[]>(
        `SELECT COUNT(DISTINCT user_address) as count
         FROM referral_bindings
         WHERE LOWER(referrer_address) = LOWER(?)`,
        [referrerAddress]
      );
      
      const count = result[0]?.count || 0;
      
      await query(
        `INSERT INTO user_stats (user_address, direct_referrals, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           direct_referrals = ?,
           updated_at = NOW()`,
        [referrerAddress.toLowerCase(), count, count]
      );
      
      logger.info(`[UserStatsService] Updated direct referrals: ${referrerAddress}, count=${count}`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed to update direct referrals: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重新计算用户等级
   * @param userAddress 用户地址
   */
  async recalculateLevel(userAddress: string): Promise<void> {
    try {
      // 获取用户数据
      const result = await query<any[]>(
        `SELECT personal_total_usdt, team_volume_usdt, team_retained_usdt
         FROM user_stats
         WHERE LOWER(user_address) = LOWER(?)`,
        [userAddress]
      );
      
      if (result.length === 0) return;
      
      const data = result[0];
      const personalUsdt = parseFloat(data.personal_total_usdt || '0');
      const teamVolumeUsdt = parseFloat(data.team_volume_usdt || '0');
      const teamRetainedUsdt = parseFloat(data.team_retained_usdt || '0');
      
      // 计算等级（简化版，实际逻辑可能更复杂）
      let level = 1;
      const levels = [
        { level: 2, personal: 1000, team: 5000, retained: 0 },
        { level: 3, personal: 3000, team: 20000, retained: 0 },
        { level: 4, personal: 5000, team: 50000, retained: 0 },
        { level: 5, personal: 10000, team: 100000, retained: 0 },
        { level: 6, personal: 20000, team: 300000, retained: 0 },
        { level: 7, personal: 50000, team: 1000000, retained: 0 },
        { level: 8, personal: 100000, team: 3000000, retained: 0 },
        { level: 9, personal: 200000, team: 10000000, retained: 0 },
      ];
      
      for (const config of levels) {
        if (
          personalUsdt >= config.personal &&
          teamVolumeUsdt >= config.team &&
          teamRetainedUsdt >= config.retained
        ) {
          level = config.level;
        } else {
          break;
        }
      }
      
      await query(
        `UPDATE user_stats 
         SET current_level = ?, effective_level = ?, updated_at = NOW()
         WHERE LOWER(user_address) = LOWER(?)`,
        [level, level, userAddress]
      );
      
      logger.info(`[UserStatsService] Updated level: ${userAddress}, level=${level}`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed to recalculate level: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完整更新用户统计数据（提现事件触发）
   * @param userAddress 用户地址
   * @param amount 提现金额（wei，USDT等值）
   * @param assetType 资产类型
   */
  async onWithdrawEvent(
    userAddress: string,
    amount: bigint,
    assetType: 'USDT' | 'RWA'
  ): Promise<void> {
    try {
      const amountStr = amount.toString();
      const field = assetType === 'USDT' ? 'personal_usdt_staked' : 'personal_rwa_staked';
      
      // 减少个人质押
      await query(
        `UPDATE user_stats 
         SET ${field} = GREATEST(CAST(${field} AS SIGNED) - ?, 0),
             updated_at = NOW()
         WHERE LOWER(user_address) = LOWER(?)`,
        [amountStr, userAddress.toLowerCase()]
      );
      
      // 重新计算 personal_total_usdt
      const rwaPrice = 0.85;
      await query(
        `UPDATE user_stats 
         SET personal_total_usdt = (
           CAST(personal_usdt_staked AS DECIMAL(38,0)) + 
           CAST(personal_rwa_staked AS DECIMAL(38,0)) * ${rwaPrice}
         ) / 1e18
         WHERE LOWER(user_address) = LOWER(?)`,
        [userAddress]
      );
      
      logger.info(`[UserStatsService] Decreased personal stake: ${userAddress}, ${assetType}, ${amount}`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed onWithdrawEvent: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完整更新用户统计数据（质押事件触发）
   * @param userAddress 用户地址
   * @param amount 质押金额（wei）
   * @param assetType 资产类型
   * @param referrerAddress 推荐人地址（可选）
   */
  async onStakeEvent(
    userAddress: string,
    amount: bigint,
    assetType: 'USDT' | 'RWA',
    referrerAddress?: string
  ): Promise<void> {
    try {
      // 1. 更新个人质押
      await this.updatePersonalStake(userAddress, amount, assetType);
      
      // 2. 计算 USDT 等值
      const rwaPrice = 0.85;
      const amountNum = Number(amount) / 1e18;
      const amountUsdt = assetType === 'USDT' ? amountNum : amountNum * rwaPrice;
      
      // 3. 更新团队业绩（递归更新所有上级）
      await this.updateTeamVolume(userAddress, amountUsdt);
      
      // 4. 如果有推荐人，更新推荐人的直推人数
      if (referrerAddress && referrerAddress !== '0x0000000000000000000000000000000000000000') {
        await this.updateDirectReferrals(referrerAddress);
      }
      
      // 5. 重新计算等级
      await this.recalculateLevel(userAddress);
      
      logger.info(`[UserStatsService] Completed onStakeEvent for ${userAddress}`);
    } catch (error: any) {
      logger.error(`[UserStatsService] Failed onStakeEvent: ${error.message}`);
      throw error;
    }
  }
}
