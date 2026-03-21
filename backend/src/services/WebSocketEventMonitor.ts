import { ethers } from 'ethers';
import { EventProcessor } from './EventProcessor';
import logger from '../utils/logger';

export class WebSocketEventMonitor {
  private provider: ethers.WebSocketProvider;
  private stakingContract: ethers.Contract;
  private eventProcessor: EventProcessor;
  private isRunning = false;

  constructor(wsUrl?: string) {
    const resolvedWsUrl = wsUrl || process.env.BSC_WS_URL || process.env.BSC_TESTNET_WS_URL;
    if (!resolvedWsUrl) {
      throw new Error('WebSocket URL not configured: set BSC_WS_URL (mainnet) or BSC_TESTNET_WS_URL');
    }
    const contractAddress = process.env.STAKING_CONTRACT_ADDRESS!;
    
    this.provider = new ethers.WebSocketProvider(resolvedWsUrl);
    this.eventProcessor = new EventProcessor();
    
    const abi = [
      'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)',
      'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'
    ];
    
    this.stakingContract = new ethers.Contract(contractAddress, abi, this.provider);
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('WebSocket Event Monitor started');

    // 监听 StakeEvent (USDT)
    this.stakingContract.on('StakeEvent', async (user, amount, referrer, stakeId, timestamp, lockPeriod, event) => {
      try {
        logger.info(`New StakeEvent: ${user}, ${amount.toString()}`);
        await this.eventProcessor.processStakeEvent({
          user,
          amount: amount.toString(),
          referrer,
          stakeId: stakeId.toString(),
          timestamp: timestamp.toString(),
          lockPeriod: lockPeriod.toString(),
          blockNumber: event.log.blockNumber,
          txHash: event.log.transactionHash
        }, 'USDT');
      } catch (error) {
        logger.error('Error processing StakeEvent:', error);
      }
    });

    // 监听 RWAStakeEvent
    this.stakingContract.on('RWAStakeEvent', async (user, amount, referrer, stakeId, timestamp, lockPeriod, event) => {
      try {
        logger.info(`New RWAStakeEvent: ${user}, ${amount.toString()}`);
        await this.eventProcessor.processStakeEvent({
          user,
          amount: amount.toString(),
          referrer,
          stakeId: stakeId.toString(),
          timestamp: timestamp.toString(),
          lockPeriod: lockPeriod.toString(),
          blockNumber: event.log.blockNumber,
          txHash: event.log.transactionHash
        }, 'RWA');
      } catch (error) {
        logger.error('Error processing RWAStakeEvent:', error);
      }
    });

    // 监听连接错误
    this.provider.on('error', (error) => {
      const message = String((error as any)?.message || error || '')
      // public RPC 经常返回临时 filter 错误，忽略以避免重连风暴
      if (message.includes('filter not found')) {
        logger.warn('WebSocket transient filter error (ignored):', message)
        return
      }
      logger.error('WebSocket error:', error)
      this.reconnect()
    });
  }

  private async reconnect() {
    logger.info('Reconnecting WebSocket...')
    this.isRunning = false
    await new Promise(resolve => setTimeout(resolve, 5000))
    try {
      await this.start()
    } catch (error) {
      logger.error('WebSocket reconnect failed:', error)
    }
  }

  async stop() {
    this.isRunning = false;
    this.stakingContract.removeAllListeners();
    await this.provider.destroy();
    logger.info('WebSocket Event Monitor stopped');
  }
}
