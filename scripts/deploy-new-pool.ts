import { ethers } from 'hardhat';

async function deployNewPool() {
  console.log('部署新的ReferralRewardPool...');
  
  const usdtAddress = '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
  const stakingAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
  
  const ReferralRewardPool = await ethers.getContractFactory('ReferralRewardPool');
  const pool = await ReferralRewardPool.deploy(usdtAddress, stakingAddress);
  
  await pool.waitForDeployment();
  const address = await pool.getAddress();
  
  console.log('✅ 新合约地址:', address);
  console.log('');
  console.log('下一步：');
  console.log('1. 更新.env中的REFERRAL_REWARD_POOL地址');
  console.log('2. 转账11000 USDT到新合约');
  console.log('3. 重新执行周结算');
}

deployNewPool();
