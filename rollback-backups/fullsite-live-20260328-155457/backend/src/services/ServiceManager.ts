import { ethers } from 'ethers';
import { RewardEngine } from './RewardEngine';
import { RewardDistributionService } from './RewardDistributionService';
import { TreasuryManager } from './TreasuryManager';
import logger from '../utils/logger';

const STAKING_ABI = require('../contracts/StakingContract.json');

let rewardService: RewardDistributionService;
let treasuryManager: TreasuryManager;

export function initializeServices() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL);
  const backendWallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY!, provider);
  const treasuryWallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY!, provider);

  const rewardEngine = new RewardEngine({
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
    stakingContractABI: STAKING_ABI,
    provider,
    backendWallet,
    maxRewardPerCall: ethers.parseEther('10000').toString()
  });

  rewardService = new RewardDistributionService(rewardEngine);

  treasuryManager = new TreasuryManager({
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
    treasuryAddress: process.env.TREASURY_ADDRESS!,
    usdtTokenAddress: process.env.USDT_TOKEN_ADDRESS!,
    rwaTokenAddress: process.env.RWA_TOKEN_ADDRESS!,
    provider,
    treasuryWallet,
    minThreshold: '50000000000',
    topUpAmount: '100000000000'
  });

  // 每小时检查国库
  setInterval(async () => {
    try {
      await treasuryManager.checkAndTopUp('USDT');
      await treasuryManager.checkAndTopUp('RWA');
    } catch (error) {
      logger.error('[Treasury] Check failed:', error);
    }
  }, 60 * 60 * 1000);

  logger.info('✅ Reward and Treasury services initialized');
}

export { rewardService, treasuryManager };
