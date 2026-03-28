const { ethers } = require('hardhat');
const { getDeployPrivateKey } = require('./load-deploy-key');

/**
 * BSC主网部署脚本
 * 
 * 部署顺序：
 * 1. RWAToken
 * 2. ReferralRewardPool（可选）
 * 3. StakingContract
 */

async function main() {
  console.log('=== BSC主网合约部署 ===');
  console.log('');
  
  // 配置
  const OWNER_ADDRESS = '0x8927e74e0fCaED1D4C87116C805464800651f222';
  const BACKEND_ADDRESS = OWNER_ADDRESS;
  const TREASURY_ADDRESS = OWNER_ADDRESS;
  const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
  
  console.log('配置信息：');
  console.log('  Owner地址:', OWNER_ADDRESS);
  console.log('  Backend地址:', BACKEND_ADDRESS);
  console.log('  国库地址:', TREASURY_ADDRESS);
  console.log('  USDT地址:', USDT_ADDRESS);
  console.log('');
  
  const deployer = new ethers.Wallet(getDeployPrivateKey(), ethers.provider);
  
  console.log('部署账户:', deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('账户余额:', ethers.formatEther(balance), 'BNB');
  console.log('');
  
  if (balance < ethers.parseEther('0.001')) {
    console.log('⚠️ 警告：BNB余额不足，建议至少0.001 BNB');
    console.log('');
  }
  
  // 1. 部署RWAToken
  console.log('1. 部署RWAToken...');
  const RWAToken = await ethers.getContractFactory('RWAToken', deployer);
  const rwaToken = await RWAToken.deploy(
    'RWA Token',                    // name
    'RWA',                          // symbol
    ethers.parseEther('1000000000'), // 1 billion initial supply
    TREASURY_ADDRESS,               // treasury address
    TREASURY_ADDRESS                // liquidity fund address (use same as treasury)
  );
  await rwaToken.waitForDeployment();
  const rwaAddress = await rwaToken.getAddress();
  console.log('✅ RWAToken部署成功:', rwaAddress);
  console.log('');
  
  // 2. 部署ReferralRewardPool（可选）
  console.log('2. 部署ReferralRewardPool...');
  const ReferralRewardPool = await ethers.getContractFactory('ReferralRewardPool', deployer);
  const referralPool = await ReferralRewardPool.deploy(rwaAddress, OWNER_ADDRESS);
  await referralPool.waitForDeployment();
  const referralPoolAddress = await referralPool.getAddress();
  console.log('✅ ReferralRewardPool部署成功:', referralPoolAddress);
  console.log('');
  
  // 3. 部署StakingContract
  console.log('3. 部署StakingContract...');
  const StakingContract = await ethers.getContractFactory('StakingContract', deployer);
  const stakingContract = await StakingContract.deploy(
    USDT_ADDRESS,
    rwaAddress,
    TREASURY_ADDRESS,
    BACKEND_ADDRESS
  );
  await stakingContract.waitForDeployment();
  const stakingAddress = await stakingContract.getAddress();
  console.log('✅ StakingContract部署成功:', stakingAddress);
  console.log('');
  
  // 4. 配置ReferralRewardPool
  console.log('4. 配置ReferralRewardPool...');
  const tx1 = await referralPool.setStakingContract(stakingAddress);
  await tx1.wait();
  console.log('✅ ReferralRewardPool配置完成');
  console.log('');
  
  // 5. 配置StakingContract
  console.log('5. 配置StakingContract...');
  const tx2 = await stakingContract.setReferralRewardPool(referralPoolAddress);
  await tx2.wait();
  console.log('✅ StakingContract配置完成');
  console.log('');
  
  // 部署总结
  console.log('='.repeat(60));
  console.log('部署完成！');
  console.log('='.repeat(60));
  console.log('');
  console.log('合约地址：');
  console.log('  RWAToken:', rwaAddress);
  console.log('  ReferralRewardPool:', referralPoolAddress);
  console.log('  StakingContract:', stakingAddress);
  console.log('');
  console.log('USDT地址（主网）:', USDT_ADDRESS);
  console.log('');
  console.log('请将以下地址更新到.env文件：');
  console.log(`RWA_TOKEN_ADDRESS=${rwaAddress}`);
  console.log(`STAKING_CONTRACT_ADDRESS=${stakingAddress}`);
  console.log(`USDT_TOKEN_ADDRESS=${USDT_ADDRESS}`);
  console.log(`REFERRAL_REWARD_POOL_ADDRESS=${referralPoolAddress}`);
  console.log('');
  console.log('⚠️ 重要：部署完成后需要：');
  console.log('1. 向StakingContract转入足够的RWA代币用于奖励');
  console.log('2. 向ReferralRewardPool转入足够的RWA代币用于推荐奖励');
  console.log('3. 更新后端.env配置');
  console.log('4. 重启后端服务');
  console.log('5. 将owner地址设置为多签钱包');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
