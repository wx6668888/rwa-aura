import { ethers } from 'hardhat';

async function deployFinal() {
  console.log('========== 部署最后3个合约 ==========\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);

  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';

  // 1. LiquidityManager
  console.log('\n1. 部署 LiquidityManager...');
  const LiquidityMgr = await ethers.getContractFactory('LiquidityManager');
  const liquidityMgr = await LiquidityMgr.deploy(RWA, USDT);
  await liquidityMgr.waitForDeployment();
  console.log('✅ LiquidityManager:', await liquidityMgr.getAddress());

  // 2. EmergencyPause
  console.log('\n2. 部署 EmergencyPause...');
  const Emergency = await ethers.getContractFactory('EmergencyPause');
  const emergency = await Emergency.deploy();
  await emergency.waitForDeployment();
  console.log('✅ EmergencyPause:', await emergency.getAddress());

  // 3. LotteryContractSimple
  console.log('\n3. 部署 LotteryContractSimple...');
  const Lottery = await ethers.getContractFactory('LotteryContractSimple');
  const lottery = await Lottery.deploy(RWA, deployer.address);
  await lottery.waitForDeployment();
  console.log('✅ LotteryContractSimple:', await lottery.getAddress());

  console.log('\n========== 全部部署完成 ==========');
}

deployFinal().catch(console.error);
