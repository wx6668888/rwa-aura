import { query } from '../config/database.config';
import logger from '../utils/logger';
import { ethers } from 'ethers';
import { PreciseYieldCalculator } from './PreciseYieldCalculator';

export class DailySettlementService {
  private calculator: PreciseYieldCalculator;
  private stakingContract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;

  constructor(config: { rpcUrl: string; stakingContractAddress: string; backendPrivateKey: string }) {
    this.calculator = new PreciseYieldCalculator();
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.backendPrivateKey, this.provider);
    const stakingABI = ["function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId) external"];
    this.stakingContract = new ethers.Contract(config.stakingContractAddress, stakingABI, wallet);
  }

  async runDailySettlement(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const toTime = this.getToday8AM(now);
    const fromTime = toTime - 86400;
    logger.info(`Starting daily settlement: ${new Date(fromTime * 1000)} to ${new Date(toTime * 1000)}`);

    const users = await this.getActiveUsers();
    let successCount = 0;

    for (const user of users) {
      try {
        await this.settleUserYield(user.address, user.asset_type, fromTime, toTime);
        successCount++;
      } catch (error) {
        logger.error(`Failed to settle ${user.address} (${user.asset_type}):`, error);
      }
    }

    logger.info(`✅ Daily settlement completed: ${successCount}/${users.length} users`);
  }

  private async settleUserYield(userAddress: string, assetType: 'USDT' | 'RWA', fromTime: number, toTime: number): Promise<void> {
    // 检查是否已结算（防重复）
    const existing = await query<Array<{ id: number }>>(`
      SELECT id FROM yield_settlements 
      WHERE user_address = ? AND asset_type = ? AND settlement_time = ?
    `, [userAddress, assetType, toTime]);
    
    if (existing.length > 0) {
      logger.info(`Already settled for ${userAddress} (${assetType}) at ${toTime}`);
      return;
    }

    const { totalYield, details } = await this.calculator.calculateYield(userAddress, assetType, fromTime, toTime);
    if (totalYield === '0') {
      logger.info(`No yield for ${userAddress} (${assetType})`);
      return;
    }

    const stakeId = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
    const yieldWei = BigInt(totalYield);

    // yieldWei 是计算出来的 18 decimals 数值：
    // - assetType='USDT'：计算结果是按 1 RWA ≈ 0.85 USDT 换算后的 RWA 等值收益
    // - assetType='RWA' ：计算结果就是 RWA 收益
    //
    // 合约 updateUserRewards 的分支逻辑是：usdtAmount==0 => RWA staking reward；usdtAmount!=0 => USDT staking reward。
    // 所以 assetType='USDT' 必须传 usdtAmount != 0，assetType='RWA' 必须传 usdtAmount == 0。
    const yieldTokenStr = ethers.formatEther(yieldWei);
    logger.info(`Updating contract: ${userAddress} ${assetType} yield=${yieldTokenStr}`);

    let tx;
    if (assetType === 'USDT') {
      // 合约内动态奖励：USDT 分支需要 usdtAmount != 0
      // 1 RWA = 0.85 USDT => usdtAmount = rwAmount * 85 / 100
      const rwAmount = yieldWei; // RWA 等值，用于写入 user.rwaPending
      const usdtAmount = (yieldWei * 85n) / 100n; // 用于触发合约 USDT 分支与做 cap 校验
      tx = await this.stakingContract.updateUserRewards(userAddress, rwAmount, usdtAmount, stakeId);
    } else {
      tx = await this.stakingContract.updateUserRewards(userAddress, yieldWei, 0, stakeId);
    }
    await tx.wait();
    logger.info(`✅ Contract updated: ${tx.hash}`);

    // yield_settlements.total_yield 定义为 DECIMAL(36,18)，需要写入“带小数”的金额
    // 不能直接写入 wei 整数，否则会被当作 0 小数位的大整数导致 Out of range。
    const totalYieldForDB = ethers.formatEther(yieldWei);
    await query(`INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userAddress, assetType, toTime, fromTime, toTime, totalYieldForDB, JSON.stringify(details), tx.hash]);
    await query(`INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp) VALUES (?, 'daily_yield', 'RWA', ?, NOW())`,
      [userAddress, totalYield]);
  }

  private async getActiveUsers(): Promise<Array<{ address: string; asset_type: 'USDT' | 'RWA' }>> {
    const users: Array<{ address: string; asset_type: 'USDT' | 'RWA' }> = [];
    const usdtUsers = await query<Array<{ address: string }>>(`SELECT DISTINCT user_address as address FROM balance_snapshots WHERE asset_type = 'USDT'`);
    users.push(...usdtUsers.map(u => ({ address: u.address, asset_type: 'USDT' as const })));
    const rwaUsers = await query<Array<{ address: string }>>(`SELECT DISTINCT user_address as address FROM balance_snapshots WHERE asset_type = 'RWA'`);
    users.push(...rwaUsers.map(u => ({ address: u.address, asset_type: 'RWA' as const })));
    return users;
  }

  private getToday8AM(now: number): number {
    const date = new Date(now * 1000);
    date.setUTCHours(0, 0, 0, 0);
    return Math.floor(date.getTime() / 1000);
  }
}
