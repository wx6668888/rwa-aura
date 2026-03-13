import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { query } from '../config/database.config';
import logger from '../utils/logger';

interface TreasuryConfig {
  stakingContractAddress: string;
  treasuryAddress: string;
  usdtTokenAddress: string;
  rwaTokenAddress: string;
  provider: ethers.JsonRpcProvider;
  treasuryWallet: ethers.Wallet;
  minThreshold: string; // 最低余额阈值
  topUpAmount: string; // 每次补充金额
}

export class TreasuryManager {
  private config: TreasuryConfig;
  private usdtContract: ethers.Contract;
  private rwaContract: ethers.Contract;
  private stakingContract: ethers.Contract;

  constructor(config: TreasuryConfig) {
    this.config = config;
    
    const erc20ABI = ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)'];
    
    this.usdtContract = new ethers.Contract(config.usdtTokenAddress, erc20ABI, config.treasuryWallet);
    this.rwaContract = new ethers.Contract(config.rwaTokenAddress, erc20ABI, config.treasuryWallet);
    this.stakingContract = new ethers.Contract(config.stakingContractAddress, erc20ABI, config.provider);
  }

  async checkAndTopUp(tokenType: 'USDT' | 'RWA'): Promise<void> {
    try {
      const contract = tokenType === 'USDT' ? this.usdtContract : this.rwaContract;
      const decimals = tokenType === 'USDT' ? 6 : 18;
      
      // 检查合约余额
      const balance = await contract.balanceOf(this.config.stakingContractAddress);
      const balanceBN = new BigNumber(balance.toString());
      const thresholdBN = new BigNumber(this.config.minThreshold);

      logger.info(`[Treasury] ${tokenType} balance: ${balanceBN.toString()}, threshold: ${thresholdBN.toString()}`);

      if (balanceBN.isLessThan(thresholdBN)) {
        logger.warn(`[Treasury] ${tokenType} below threshold, initiating top-up`);
        await this.topUp(tokenType);
      }
    } catch (error) {
      logger.error(`[Treasury] Check failed for ${tokenType}:`, error);
      throw error;
    }
  }

  private async topUp(tokenType: 'USDT' | 'RWA'): Promise<void> {
    try {
      const contract = tokenType === 'USDT' ? this.usdtContract : this.rwaContract;
      const amount = this.config.topUpAmount;

      logger.info(`[Treasury] Transferring ${amount} ${tokenType} to staking contract`);

      const tx = await contract.transfer(this.config.stakingContractAddress, amount);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        logger.info(`[Treasury] ✅ Top-up success: ${tokenType}, tx=${tx.hash}`);
        await this.logTopUp(tokenType, amount, tx.hash, 'success');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      logger.error(`[Treasury] ❌ Top-up failed: ${tokenType}`, error);
      await this.logTopUp(tokenType, this.config.topUpAmount, '', 'failed', error.message);
      throw error;
    }
  }

  private async logTopUp(tokenType: string, amount: string, txHash: string, status: string, error?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO treasury_topup_logs (token_type, amount, tx_hash, status, error_message, timestamp)
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [tokenType, amount, txHash, status, error || null]
      );
    } catch (err) {
      logger.error('[Treasury] Failed to log:', err);
    }
  }
}
