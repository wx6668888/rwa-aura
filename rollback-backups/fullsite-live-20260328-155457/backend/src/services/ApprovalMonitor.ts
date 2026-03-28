import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';

export class ApprovalMonitor {
  private provider: ethers.JsonRpcProvider;
  private usdtContract: ethers.Contract;
  private stakingAddress: string;
  private isRunning = false;

  constructor(rpcUrl: string, usdtAddress: string, stakingAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.stakingAddress = stakingAddress;
    
    const USDT_ABI = [
      'event Approval(address indexed owner, address indexed spender, uint256 value)'
    ];
    
    this.usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, this.provider);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('ApprovalMonitor started');

    this.usdtContract.on('Approval', async (owner, spender, value, event) => {
      if (spender.toLowerCase() !== this.stakingAddress.toLowerCase()) return;
      if (value === 0n) return;

      const userAddress = owner.toLowerCase();
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;
      
      try {
        // 保存授权记录
        await query(
          `INSERT IGNORE INTO approval_events 
           (user_address, spender_address, amount, tx_hash, block_number, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userAddress, this.stakingAddress.toLowerCase(), value.toString(), txHash, blockNumber, Math.floor(Date.now() / 1000)]
        );
        
        // 创建用户
        await query(
          `INSERT INTO users (address, node_level, is_active) 
           VALUES (?, 1, true) 
           ON DUPLICATE KEY UPDATE address=address`,
          [userAddress]
        );
        
        logger.info(`Approval saved: ${userAddress} -> ${value.toString()}`);
      } catch (error) {
        logger.error('Error processing approval:', error);
      }
    });
  }

  stop() {
    this.usdtContract.removeAllListeners();
    this.isRunning = false;
    logger.info('ApprovalMonitor stopped');
  }
}
