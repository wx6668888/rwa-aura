const { ethers } = require('hardhat');

async function deployAdditionalContracts() {
  console.log('=== 部署额外合约 ===');
  console.log('');
  
  // 配置
  const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
  const RWA_ADDRESS = '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812';
  const TREASURY_ADDRESS = '0x08Ea66321c4dd47468c3aDc55d06c5De7129A292';
  
  // 创建部署钱包
  const PRIVATE_KEY = '0x72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
  const deployer = new ethers.Wallet(PRIVATE_KEY, ethers.provider);
  
  console.log('部署账户:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('账户余额:', ethers.formatEther(balance), 'BNB');
  console.log('');
  
  // 1. 部署USDTRWASwap
  console.log('1. 部署USDTRWASwap...');
  const USDTRWASwap = await ethers.getContractFactory('USDTRWASwap', deployer);
  const swapContract = await USDTRWASwap.deploy(USDT_ADDRESS, RWA_ADDRESS);
  await swapContract.waitForDeployment();
  const swapAddress = await swapContract.getAddress();
  console.log('✅ USDTRWASwap部署成功:', swapAddress);
  console.log('');
  
  // 2. 部署LotteryContractSimple
  console.log('2. 部署LotteryContractSimple...');
  const LotteryContract = await ethers.getContractFactory('LotteryContractSimple', deployer);
  const lotteryContract = await LotteryContract.deploy(RWA_ADDRESS, TREASURY_ADDRESS);
  await lotteryContract.waitForDeployment();
  const lotteryAddress = await lotteryContract.getAddress();
  console.log('✅ LotteryContractSimple部署成功:', lotteryAddress);
  console.log('');
  
  // 3. 部署MetaStakingExtension
  console.log('3. 部署MetaStakingExtension...');
  const MetaStaking = await ethers.getContractFactory('MetaStakingExtension', deployer);
  const metaStaking = await MetaStaking.deploy();
  await metaStaking.waitForDeployment();
  const metaStakingAddress = await metaStaking.getAddress();
  console.log('✅ MetaStakingExtension部署成功:', metaStakingAddress);
  console.log('');
  
  // 部署总结
  console.log('='.repeat(60));
  console.log('部署完成！');
  console.log('='.repeat(60));
  console.log('');
  console.log('合约地址：');
  console.log('  USDTRWASwap:', swapAddress);
  console.log('  LotteryContractSimple:', lotteryAddress);
  console.log('  MetaStakingExtension:', metaStakingAddress);
  console.log('');
  console.log('⚠️ 重要：');
  console.log('1. 向USDTRWASwap转入RWA和USDT流动性');
  console.log('2. 向LotteryContract转入RWA作为奖池');
  console.log('3. 更新前端配置');
}

deployAdditionalContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
