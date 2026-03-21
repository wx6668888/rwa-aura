import { getPool } from '../config/database.config';
import logger from '../utils/logger';

/**
 * 用户统计数据同步服务
 * 每分钟从 stake_events 表重新计算并更新 user_stats 表
 * 解决 EventMonitor filter 失效导致的数据不同步问题
 */
export class UserStatsSyncService {
  private pool = getPool();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 60000; // 1分钟

  start() {
    logger.info('[UserStatsSync] Starting...');
    
    // 立即执行一次
    this.syncAllUsers().catch(err => 
      logger.error('[UserStatsSync] Initial sync failed:', err)
    );
    
    // 定期同步
    this.syncInterval = setInterval(() => {
      this.syncAllUsers().catch(err =>
        logger.error('[UserStatsSync] Sync failed:', err)
      );
    }, this.SYNC_INTERVAL_MS);
    
    logger.info('[UserStatsSync] Started');
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('[UserStatsSync] Stopped');
    }
  }

  private async syncAllUsers() {
    try {
      // 获取所有有质押记录的用户
      const [users] = await this.pool.query(
        'SELECT DISTINCT user_address FROM stake_events'
      ) as any[];
      
      let successCount = 0;
      
      for (const user of users) {
        const addr = user.user_address;
        
        // 计算总USDT质押
        const [usdtStakes] = await this.pool.query(
          'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE user_address = ? AND event_type LIKE "%USDT%"',
          [addr]
        ) as any[];
        
        // 计算总RWA质押
        const [rwaStakes] = await this.pool.query(
          'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE user_address = ? AND event_type LIKE "%RWA%"',
          [addr]
        ) as any[];
        
        // 计算USDT提现
        const [usdtWithdraws] = await this.pool.query(
          'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE user_address = ? AND event_type LIKE "%USDT%"',
          [addr]
        ) as any[];
        
        // 计算RWA提现（amount存储为USDT等值，需要转换）
        const [rwaWithdraws] = await this.pool.query(
          'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE user_address = ? AND event_type LIKE "%RWA%"',
          [addr]
        ) as any[];
        
        const totalUSDT = BigInt(usdtStakes[0]?.total || '0');
        const totalRWA = BigInt(rwaStakes[0]?.total || '0');
        const withdrawnUSDT = BigInt(usdtWithdraws[0]?.total || '0');
        const withdrawnRWAUSDT = BigInt(rwaWithdraws[0]?.total || '0');
        const withdrawnRWA = (withdrawnRWAUSDT * 100n) / 85n; // 转换回RWA
        
        // 计算净质押（总质押 - 总提现）
        const netUSDT = totalUSDT > withdrawnUSDT ? totalUSDT - withdrawnUSDT : 0n;
        const netRWA = totalRWA > withdrawnRWA ? totalRWA - withdrawnRWA : 0n;
        
        // 更新 user_stats
        await this.pool.query(
          `UPDATE user_stats 
           SET personal_usdt_staked = ?, 
               personal_rwa_staked = ?,
               updated_at = NOW()
           WHERE user_address = ?`,
          [netUSDT.toString(), netRWA.toString(), addr]
        );
        
        successCount++;
      }
      
      logger.info(`[UserStatsSync] Synced ${successCount} users`);
    } catch (error) {
      logger.error('[UserStatsSync] syncAllUsers error:', error);
    }
  }
}
