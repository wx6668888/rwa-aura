// 定期同步 rwaPending 到 user_stats 表
import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { getBscRpcUrl } from '../config/rpc-url';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';

const RPC_URL = getBscRpcUrl();
const STAKING_CONTRACT =
  process.env.STAKING_CONTRACT ||
  process.env.STAKING_CONTRACT_ADDRESS ||
  BSC_MAINNET_ADDRESSES.stakingContract;

const ABI = [
  'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
];

export class RwaPendingSyncService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(STAKING_CONTRACT, ABI, this.provider);
  }

  async syncAllUsers(): Promise<void> {
    try {
      logger.info('开始同步 rwaPending 数据...');

      const users = await query<{ address: string }[]>(
        'SELECT DISTINCT address FROM users WHERE is_active = 1'
      );

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          await this.syncUser(user.address);
          successCount++;
        } catch (error) {
          logger.error(`同步用户 ${user.address} 失败:`, error);
          errorCount++;
        }
      }

      logger.info(`rwaPending 同步完成: 成功=${successCount}, 失败=${errorCount}`);
    } catch (error) {
      logger.error('同步 rwaPending 失败:', error);
      throw error;
    }
  }

  async syncUser(userAddress: string): Promise<void> {
    const [userInfo, rwaInfo] = await Promise.all([
      this.contract.users(userAddress),
      this.contract.rwaStakes(userAddress)
    ]);

    const usdtRwaPending = userInfo.rwaPending.toString();
    const rwaRwaPending = rwaInfo.rwaPending.toString();

    // user_stats 可能尚未为该地址创建（withdraw-v2 直接从 user_stats 读）。
    // 用 UPSERT 确保 pending 同步时能写入/创建该行。
    await query(
      `INSERT INTO user_stats (user_address, usdt_rwa_pending, rwa_rwa_pending, rwa_pending_updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         usdt_rwa_pending = VALUES(usdt_rwa_pending),
         rwa_rwa_pending = VALUES(rwa_rwa_pending),
         rwa_pending_updated_at = NOW()`,
      [userAddress, usdtRwaPending, rwaRwaPending]
    );
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const service = new RwaPendingSyncService();
  service.syncAllUsers()
    .then(() => {
      console.log('✅ 同步完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 同步失败:', error);
      process.exit(1);
    });
}
