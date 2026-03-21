import { ethers } from 'hardhat';

async function deployGasless() {
  console.log('========== 部署完全 Gasless 系统 ==========\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);

  // 1. 部署支持 Permit 的 USDT
  console.log('\n1. 部署 TestUSDTWithPermit...');
  const USDT = await ethers.getContractFactory('TestUSDTWithPermit');
  const usdt = await USDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log('✅ USDT:', usdtAddr);

  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const TREASURY = deployer.address;
  const BACKEND = deployer.address;

  // 2. 部署 StakingContract
  console.log('\n2. 部署 StakingContract...');
  const Staking = await ethers.getContractFactory('StakingContract');
  const staking = await Staking.deploy(usdtAddr, RWA, TREASURY, BACKEND);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log('✅ StakingContract:', stakingAddr);

  console.log('\n========== 部署完成 ==========');
  console.log('USDT (Permit):', usdtAddr);
  console.log('StakingContract:', stakingAddr);
}

deployGasless().catch(console.error);
