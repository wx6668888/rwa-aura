const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function getUserStakeInfo(address user) view returns (uint256 totalStaked, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function rwaStakes(address user) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, provider);
  
  const userAddr = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 从合约读取用户数据 ===');
  console.log('用户地址:', userAddr);
  console.log('');
  
  // 读取USDT质押信息
  const usdtInfo = await contract.getUserStakeInfo(userAddr);
  const usdtTotal = Number(ethers.formatUnits(usdtInfo[0], 18));
  
  console.log('USDT质押信息:');
  console.log('  当前总质押:', usdtTotal.toFixed(2), 'USDT');
  console.log('');
  
  // 读取RWA质押信息
  const rwaInfo = await contract.rwaStakes(userAddr);
  const rwaTotal = Number(ethers.formatUnits(rwaInfo[0], 18));
  
  console.log('RWA质押信息:');
  console.log('  当前总质押:', rwaTotal.toFixed(2), 'RWA');
  console.log('');
  
  console.log('=== 对比数据库锁仓数据 ===');
  console.log('数据库当前锁仓USDT: 4245.00');
  console.log('数据库当前锁仓RWA: 5381.00');
  console.log('');
  
  console.log('=== 计算灵活本金 ===');
  const flexUSDT = usdtTotal - 4245;
  const flexRWA = rwaTotal - 5381;
  console.log('灵活USDT本金:', flexUSDT.toFixed(2));
  console.log('灵活RWA本金:', flexRWA.toFixed(2));
})();
