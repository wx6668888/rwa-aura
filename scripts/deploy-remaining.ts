import { ethers } from 'hardhat';

async function deployRemaining() {
  console.log('========== 部署剩余合约 ==========\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);

  // 已部署的合约地址
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const STAKING = '0xD2AA6CFC4409C8a7C2912B460DBC58f128D19246';

  // 1. ReferralRewardPool
  console.log('\n1. 部署 ReferralRewardPool...');
  const ReferralPool = await ethers.getContractFactory('ReferralRewardPool');
  const referralPool = await ReferralPool.deploy(USDT, STAKING);
  await referralPool.waitForDeployment();
  console.log('✅ ReferralRewardPool:', await referralPool.getAddress());

  // 2. TeamDividendPool (需要两个不同的签名者)
  console.log('\n2. 部署 TeamDividendPool...');
  const TeamPool = await ethers.getContractFactory('TeamDividendPool');
  const teamPool = await TeamPool.deploy(
    USDT,
    deployer.address, // backendSigner
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // adminSigner (不同地址)
    ethers.parseUnits('100', 6) // reservedGas
  );
  await teamPool.waitForDeployment();
  console.log('✅ TeamDividendPool:', await teamPool.getAddress());

  // 3. TreasuryContract
  console.log('\n3. 部署 TreasuryContract...');
  const Treasury = await ethers.getContractFactory('TreasuryContract');
  const treasury = await Treasury.deploy(USDT);
  await treasury.waitForDeployment();
  console.log('✅ TreasuryContract:', await treasury.getAddress());

  // 4. PriceStabilizer
  console.log('\n4. 部署 PriceStabilizer...');
  const Stabilizer = await ethers.getContractFactory('PriceStabilizer');
  const stabilizer = await Stabilizer.deploy(RWA, USDT);
  await stabilizer.waitForDeployment();
  console.log('✅ PriceStabilizer:', await stabilizer.getAddress());

  console.log('\n========== 部署完成 ==========');
}

deployRemaining().catch(console.error);
