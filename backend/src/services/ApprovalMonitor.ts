import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';

export class ApprovalMonitor {
  private provider: ethers.JsonRpcProvider;
  private usdtContract: ethers.Contract;
  private stakingAddress: string;
  private isRunning = false;
  private timer?: NodeJS.Timeout;
  private lastScannedBlock?: number;

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

    const approvalTopic = ethers.id('Approval(address,address,uint256)');

    const scanOnce = async () => {
      if (!this.isRunning) return;
      try {
        const latest = await this.provider.getBlockNumber();
        if (this.lastScannedBlock === undefined) {
          this.lastScannedBlock = Math.max(0, latest - 500);
        }
        const fromBlock = Math.min(this.lastScannedBlock + 1, latest);
        const toBlock = latest;
        if (fromBlock > toBlock) return;

        const logs = await this.provider.getLogs({
          address: this.usdtContract.target as string,
          topics: [approvalTopic],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          try {
            const parsed = this.usdtContract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (!parsed) continue;
            const owner = String((parsed.args as any)?.owner || '').toLowerCase();
            const spender = String((parsed.args as any)?.spender || '').toLowerCase();
            const value = BigInt(String((parsed.args as any)?.value ?? '0'));
            if (!owner || spender !== this.stakingAddress.toLowerCase()) continue;
            if (value === BigInt(0)) continue;

            const txHash = log.transactionHash;
            const blockNumber = log.blockNumber;

            await query(
              `INSERT IGNORE INTO approval_events 
               (user_address, spender_address, amount, tx_hash, block_number, timestamp) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                owner,
                this.stakingAddress.toLowerCase(),
                value.toString(),
                txHash,
                blockNumber,
                Math.floor(Date.now() / 1000),
              ]
            );

            await query(
              `INSERT INTO users (address, node_level, is_active) 
               VALUES (?, 1, true) 
               ON DUPLICATE KEY UPDATE address=address`,
              [owner]
            );
          } catch (e) {
            logger.error('Error processing approval log:', e);
          }
        }

        this.lastScannedBlock = toBlock;
      } catch (e) {
        const msg = String((e as any)?.message || e || '');
        if (msg.includes('invalid block range params')) {
          this.lastScannedBlock = await this.provider.getBlockNumber();
          return;
        }
        logger.error('ApprovalMonitor scan failed:', e);
      }
    };

    await scanOnce();
    this.timer = setInterval(scanOnce, 12_000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.isRunning = false;
    logger.info('ApprovalMonitor stopped');
  }
}
