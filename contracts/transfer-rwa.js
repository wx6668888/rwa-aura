const { ethers } = require('ethers');
const { getDeployPrivateKey } = require('./load-deploy-key');

async function transferRWA() {
  // 配置
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = getDeployPrivateKey();
  const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const STAKING_CONTRACT = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  const REFERRAL_POOL = '0x80748B89042Ee30953E55856Cac473D1126720A6';
  
  // 连接到BSC主网
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('发送地址:', wallet.address);
  console.log('');
  
  // RWA代币合约ABI（只需要transfer和balanceOf）
  const tokenABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)'
  ];
  
  const rwaToken = new ethers.Contract(RWA_TOKEN, tokenABI, wallet);
  
  // 检查余额
  console.log('检查RWA余额...');
  const balance = await rwaToken.balanceOf(wallet.address);
  console.log('当前余额:', ethers.formatEther(balance), 'RWA');
  console.log('');
  
  if (balance < ethers.parseEther('150000')) {
    console.log('❌ 余额不足，需要至少150,000 RWA');
    return;
  }
  
  // 转账到StakingContract
  console.log('1. 转账100,000 RWA到StakingContract...');
  const tx1 = await rwaToken.transfer(STAKING_CONTRACT, ethers.parseEther('100000'));
  console.log('交易哈希:', tx1.hash);
  await tx1.wait();
  console.log('✅ 转账成功');
  console.log('');
  
  // 转账到ReferralRewardPool
  console.log('2. 转账50,000 RWA到ReferralRewardPool...');
  const tx2 = await rwaToken.transfer(REFERRAL_POOL, ethers.parseEther('50000'));
  console.log('交易哈希:', tx2.hash);
  await tx2.wait();
  console.log('✅ 转账成功');
  console.log('');
  
  // 验证余额
  console.log('验证转账结果...');
  const stakingBalance = await rwaToken.balanceOf(STAKING_CONTRACT);
  const poolBalance = await rwaToken.balanceOf(REFERRAL_POOL);
  console.log('StakingContract余额:', ethers.formatEther(stakingBalance), 'RWA');
  console.log('ReferralRewardPool余额:', ethers.formatEther(poolBalance), 'RWA');
  console.log('');
  console.log('✅ 所有转账完成！');
}

transferRWA()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('错误:', error);
    process.exit(1);
  });
