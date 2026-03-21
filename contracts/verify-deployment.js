const { ethers } = require('hardhat');
require('dotenv').config();

/**
 * 部署后验证脚本
 * 检查所有合约配置是否正确
 */

async function main() {
  console.log('=== 合约部署验证 ===');
  console.log('');
  
  // 从命令行参数获取合约地址
  const rwaAddress = process.argv[2];
  const stakingAddress = process.argv[3];
  const referralPoolAddress = process.argv[4];
  
  if (!rwaAddress || !stakingAddress || !referralPoolAddress) {
    console.log('用法: npx hardhat run verify-deployment.js --network bscMainnet <RWA地址> <Staking地址> <ReferralPool地址>');
    process.exit(1);
  }
  
  console.log('合约地址：');
  console.log('  RWAToken:', rwaAddress);
  console.log('  StakingContract:', stakingAddress);
  console.log('  ReferralRewardPool:', referralPoolAddress);
  console.log('');
  
  // 连接合约
  const rwaToken = await ethers.getContractAt('RWAToken', rwaAddress);
  const stakingContract = await ethers.getContractAt('StakingContract', stakingAddress);
  const referralPool = await ethers.getContractAt('ReferralRewardPool', referralPoolAddress);
  
  console.log('检查合约配置...');
  console.log('');
  
  // 检查RWAToken
  console.log('1. RWAToken:');
  const rwaOwner = await rwaToken.owner();
  const rwaName = await rwaToken.name();
  const rwaSymbol = await rwaToken.symbol();
  const rwaTotalSupply = await rwaToken.totalSupply();
  console.log('  Owner:', rwaOwner);
  console.log('  Name:', rwaName);
  console.log('  Symbol:', rwaSymbol);
  console.log('  Total Supply:', ethers.formatEther(rwaTotalSupply));
  console.log('');
  
  // 检查StakingContract
  console.log('2. StakingContract:');
  const stakingOwner = await stakingContract.owner();
  const treasuryAddress = await stakingContract.treasuryAddress();
  const backendAddress = await stakingContract.backendAddress();
  const usdtToken = await stakingContract.usdtToken();
  const rwaTokenInStaking = await stakingContract.rwaToken();
  const referralPoolInStaking = await stakingContract.referralRewardPool();
  console.log('  Owner:', stakingOwner);
  console.log('  Treasury:', treasuryAddress);
  console.log('  Backend:', backendAddress);
  console.log('  USDT Token:', usdtToken);
  console.log('  RWA Token:', rwaTokenInStaking);
  console.log('  Referral Pool:', referralPoolInStaking);
  
  // 检查余额
  const stakingRwaBalance = await rwaToken.balanceOf(stakingAddress);
  console.log('  RWA余额:', ethers.formatEther(stakingRwaBalance));
  console.log('');
  
  // 检查ReferralRewardPool
  console.log('3. ReferralRewardPool:');
  const poolOwner = await referralPool.owner();
  const poolRwaToken = await referralPool.rwaToken();
  const poolStakingContract = await referralPool.stakingContract();
  const poolRwaBalance = await rwaToken.balanceOf(referralPoolAddress);
  console.log('  Owner:', poolOwner);
  console.log('  RWA Token:', poolRwaToken);
  console.log('  Staking Contract:', poolStakingContract);
  console.log('  RWA余额:', ethers.formatEther(poolRwaBalance));
  console.log('');
  
  // 验证配置
  console.log('=== 配置验证 ===');
  let hasError = false;
  
  if (rwaTokenInStaking.toLowerCase() !== rwaAddress.toLowerCase()) {
    console.log('❌ StakingContract的RWA地址配置错误');
    hasError = true;
  } else {
    console.log('✅ StakingContract的RWA地址配置正确');
  }
  
  if (referralPoolInStaking.toLowerCase() !== referralPoolAddress.toLowerCase()) {
    console.log('❌ StakingContract的ReferralPool地址配置错误');
    hasError = true;
  } else {
    console.log('✅ StakingContract的ReferralPool地址配置正确');
  }
  
  if (poolStakingContract.toLowerCase() !== stakingAddress.toLowerCase()) {
    console.log('❌ ReferralPool的StakingContract地址配置错误');
    hasError = true;
  } else {
    console.log('✅ ReferralPool的StakingContract地址配置正确');
  }
  
  if (stakingRwaBalance < ethers.parseEther('1000')) {
    console.log('⚠️ StakingContract的RWA余额不足（建议至少100,000）');
  } else {
    console.log('✅ StakingContract的RWA余额充足');
  }
  
  if (poolRwaBalance < ethers.parseEther('1000')) {
    console.log('⚠️ ReferralPool的RWA余额不足（建议至少50,000）');
  } else {
    console.log('✅ ReferralPool的RWA余额充足');
  }
  
  console.log('');
  if (hasError) {
    console.log('❌ 验证失败，请检查配置');
    process.exit(1);
  } else {
    console.log('✅ 所有配置验证通过');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
