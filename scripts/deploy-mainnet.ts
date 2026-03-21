import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 开始部署到BSC主网...\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('账户余额:', ethers.formatEther(balance), 'BNB\n');

  if (balance < ethers.parseEther('0.1')) {
    throw new Error('❌ BNB余额不足，至少需要0.1 BNB');
  }

  // BSC主网USDT地址
  const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
  
  console.log('📝 部署参数:');
  console.log('- USDT地址:', USDT_ADDRESS);
  console.log('- Treasury:', deployer.address);
  console.log('- Buyback:', deployer.address);
  console.log();

  // 1. 部署RWAToken
  console.log('1️⃣ 部署RWAToken...');
  const RWAToken = await ethers.getContractFactory('RWAToken');
  const rwaToken = await RWAToken.deploy();
  await rwaToken.waitForDeployment();
  const rwaAddress = await rwaToken.getAddress();
  console.log('✅ RWAToken:', rwaAddress, '\n');

  // 2. 部署StRWA
  console.log('2️⃣ 部署StRWA...');
  const StRWA = await ethers.getContractFactory('StRWA');
  const strwa = await StRWA.deploy();
  await strwa.waitForDeployment();
  const strwaAddress = await strwa.getAddress();
  console.log('✅ StRWA:', strwaAddress, '\n');

  // 3. 部署StakingContract
  console.log('3️⃣ 部署StakingContract...');
  const StakingContract = await ethers.getContractFactory('NodeLevelStaking');
  const staking = await StakingContract.deploy(
    USDT_ADDRESS,
    rwaAddress,
    strwaAddress,
    deployer.address, // treasury
    deployer.address  // buyback
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log('✅ StakingContract:', stakingAddress, '\n');

  // 4. 配置RWAToken
  console.log('4️⃣ 配置RWAToken...');
  await rwaToken.setStakingContract(stakingAddress);
  console.log('✅ RWAToken已配置\n');

  // 5. 配置StRWA
  console.log('5️⃣ 配置StRWA...');
  await strwa.setStakingContract(stakingAddress);
  console.log('✅ StRWA已配置\n');

  // 6. 部署ReferralRewardPool
  console.log('6️⃣ 部署ReferralRewardPool...');
  const ReferralRewardPool = await ethers.getContractFactory('ReferralRewardPool');
  const rewardPool = await ReferralRewardPool.deploy(USDT_ADDRESS, stakingAddress);
  await rewardPool.waitForDeployment();
  const rewardPoolAddress = await rewardPool.getAddress();
  console.log('✅ ReferralRewardPool:', rewardPoolAddress, '\n');

  console.log('🎉 部署完成！\n');
  console.log('📋 合约地址汇总:');
  console.log('================================');
  console.log('RWAToken:', rwaAddress);
  console.log('StRWA:', strwaAddress);
  console.log('StakingContract:', stakingAddress);
  console.log('ReferralRewardPool:', rewardPoolAddress);
  console.log('USDT:', USDT_ADDRESS);
  console.log('================================\n');

  console.log('📝 后续步骤:');
  console.log('1. 更新.env文件中的合约地址');
  console.log('2. 给StakingContract充值USDT');
  console.log('3. 给ReferralRewardPool充值USDT');
  console.log('4. 重启后端服务');
  console.log('5. 更新前端配置');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
