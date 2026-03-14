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
    logger.info(`Updating contract: ${userAddress} ${assetType} yield=${ethers.formatEther(yieldWei)} RWA`);

    const tx = await this.stakingContract.updateUserRewards(userAddress, yieldWei, 0, stakeId);
    await tx.wait();
    logger.info(`✅ Contract updated: ${tx.hash}`);

    await query(`INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userAddress, assetType, toTime, fromTime, toTime, totalYield, JSON.stringify(details), tx.hash]);
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
