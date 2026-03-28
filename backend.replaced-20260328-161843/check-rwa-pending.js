// 检查用户链上数据
const ethers = require('ethers');

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const USER_ADDRESS = '0xCD5b97505499B1575e481446384430bb159851b6';

const ABI = [
  'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
];

async function checkUserData() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(STAKING_CONTRACT, ABI, provider);
  
  console.log('🔍 检查用户数据:', USER_ADDRESS);
  console.log('');
  
  // 1. USDT 质押信息
  const userInfo = await contract.users(USER_ADDRESS);
  console.log('📊 USDT 质押信息:');
  console.log('  总质押:', Number(userInfo.totalStaked) / 1e18, 'USDT');
  console.log('  待提取RWA:', Number(userInfo.rwaPending) / 1e18, 'RWA');
  console.log('  首次质押时间:', new Date(Number(userInfo.firstStakeTime) * 1000).toLocaleString());
  console.log('');
  
  // 2. RWA 质押信息
  const rwaInfo = await contract.rwaStakes(USER_ADDRESS);
  console.log('📊 RWA 质押信息:');
  console.log('  总质押:', Number(rwaInfo.totalStakedRWA) / 1e18, 'RWA');
  console.log('  待提取RWA:', Number(rwaInfo.rwaPending) / 1e18, 'RWA');
  console.log('  首次质押时间:', new Date(Number(rwaInfo.firstStakeTime) * 1000).toLocaleString());
  console.log('');
  
  // 3. 合并显示
  const totalRwaPending = Number(userInfo.rwaPending) / 1e18 + Number(rwaInfo.rwaPending) / 1e18;
  console.log('💰 待提取RWA总额:', totalRwaPending, 'RWA');
  console.log('');
  
  // 4. 分析
  if (totalRwaPending === 0) {
    console.log('⚠️ 分析: 待提取RWA为0');
    console.log('   原因: 刚质押的RWA需要时间累积收益');
    console.log('   说明: 这是正常的，收益按天计算');
  } else {
    console.log('✅ 待提取RWA有数据');
  }
}

checkUserData().catch(console.error);
