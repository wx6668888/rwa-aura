const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function updateUserRewards(address user, uint256 rwaAmount, uint256 usdtAmount, uint256 stakeId) external"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, wallet);

  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('重置合约收益为0...');
  const tx = await contract.updateUserRewards(userAddress, 0, 0, 0);
  console.log('交易已发送:', tx.hash);
  
  await tx.wait();
  console.log('✅ 合约收益已重置为0');
})();
