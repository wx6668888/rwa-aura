require('dotenv').config();
const { NodeLevelService } = require('./dist/services/NodeLevelService');
const ethers = require('ethers');

const NODE_LEVEL_STAKING_ABI = [
    'function getUserStakeInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256, address, uint8, uint256)',
    'function updateNodeLevel(address userAddress, uint8 newLevel) external'
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  
  const service = new NodeLevelService({
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS,
    stakingContractABI: NODE_LEVEL_STAKING_ABI,
    provider,
    backendWallet: wallet
  });
  
  console.log('检查用户等级升级: 0xcd5b97505499b1575e481446384430bb159851b6');
  const upgraded = await service.checkAndUpgradeNodeLevel('0xcd5b97505499b1575e481446384430bb159851b6');
  console.log('升级结果:', upgraded);
  
  process.exit(0);
})();
