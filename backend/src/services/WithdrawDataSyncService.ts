import { ethers } from 'ethers';
import { getPool } from '../config/database.config';
import logger from '../utils/logger';
import { getBscRpcUrl } from '../config/rpc-url';

/**
 * 提现数据同步服务
 * 定期从链上同步：referral_balance, dividend_balance, strwa_balance
 */
export class WithdrawDataSyncService {
  private provider: ethers.JsonRpcProvider;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 60000; // 1分钟
  private pool = getPool();

  constructor() {
    const rpcUrl = getBscRpcUrl();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * 启动定期同步
   */
  start() {
    if (this.syncInterval) {
      logger.info('[WithdrawDataSync] Already running, skip start');
      return;
    }
    logger.info('[WithdrawDataSync] Starting...');
    
    // 立即执行一次
    this.syncAllUsers().catch(err => 
      logger.error('[WithdrawDataSync] Initial sync failed:', err)
    );
    
    // 定期同步
    this.syncInterval = setInterval(() => {
      this.syncAllUsers().catch(err =>
        logger.error('[WithdrawDataSync] Sync failed:', err)
      );
    }, this.SYNC_INTERVAL_MS);
    
    logger.info('[WithdrawDataSync] Started');
  }

  /**
   * 停止同步
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('[WithdrawDataSync] Stopped');
    }
  }

  /**
   * 同步所有用户数据
   */
  private async syncAllUsers() {
    try {
      // 获取所有用户地址
      const [rows] = await this.pool.query('SELECT user_address FROM user_stats');
      const users = rows as Array<{ user_address: string }>;
      
      logger.info(`[WithdrawDataSync] Syncing ${users.length} users...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const user of users) {
        try {
          await this.syncUserData(user.user_address);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error(`[WithdrawDataSync] Failed to sync ${user.user_address}:`, error);
        }
      }
      
      logger.info(`[WithdrawDataSync] Completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      logger.error('[WithdrawDataSync] syncAllUsers error:', error);
    }
  }

  /**
   * 同步单个用户数据
   */
  private async syncUserData(userAddress: string) {
    const referralPoolAddress = process.env.REFERRAL_REWARD_POOL;
    const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    const strwaAddress = process.env.STRWA_ADDRESS;
    
    let referralBalance = '0';
    let dividendBalance = '0';
    let strwaBalance = '0';
    
    // 1. 读取推荐奖励余额
    if (referralPoolAddress) {
      try {
        const contract = new ethers.Contract(
          referralPoolAddress,
          ['function withdrawableBalance(address) view returns (uint256)'],
          this.provider
        );
        const balance = await contract.withdrawableBalance(userAddress);
        referralBalance = balance.toString();
      } catch (err) {
        // 忽略错误，使用默认值0
      }
    }
    
    // 2. 读取分红余额
    if (stakingContractAddress) {
      try {
        const contract = new ethers.Contract(
          stakingContractAddress,
          ['function dividends(address) view returns (uint256)'],
          this.provider
        );
        const balance = await contract.dividends(userAddress);
        dividendBalance = balance.toString();
      } catch (err) {
        // 忽略错误，使用默认值0
      }
    }
    
    // 3. 读取stRWA余额
    if (strwaAddress) {
      try {
        const contract = new ethers.Contract(
          strwaAddress,
          ['function balanceOf(address) view returns (uint256)'],
          this.provider
        );
        const balance = await contract.balanceOf(userAddress);
        strwaBalance = balance.toString();
      } catch (err) {
        // 忽略错误，使用默认值0
      }
    }
    
    // 更新数据库
    await this.pool.query(`
      UPDATE user_stats
      SET 
        referral_balance = ?,
        dividend_balance = ?,
        strwa_balance = ?,
        updated_at = NOW()
      WHERE user_address = ?
    `, [referralBalance, dividendBalance, strwaBalance, userAddress]);
  }
}
