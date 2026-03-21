const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function getUserRewards(address user) external view returns (uint256 rwaRewards, uint256 usdtRewards)"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, provider);

  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  const [rwa, usdt] = await contract.getUserRewards(userAddress);
  console.log('合约上的收益:');
  console.log('RWA:', ethers.formatEther(rwa));
  console.log('USDT:', ethers.formatEther(usdt));
})();
