import { ethers } from 'hardhat';

async function deployMetaStaking() {
  console.log('========== 部署支持 Meta Transaction 的 StakingContract ==========\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);

  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const STRWA = '0xfF1C231c2810F58BD568252B74557b2Df242d209';
  const TREASURY = deployer.address;
  const BACKEND = deployer.address;

  console.log('\n部署 StakingContract (支持 Meta Transaction)...');
  const Staking = await ethers.getContractFactory('StakingContract');
  const staking = await Staking.deploy(USDT, RWA, TREASURY, BACKEND);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log('✅ StakingContract:', stakingAddr);

  console.log('\n配置 StRWA...');
  await staking.setStRWAToken(STRWA);
  console.log('✅ 完成');

  console.log('\n========== 部署完成 ==========');
  console.log('新 StakingContract:', stakingAddr);
  console.log('\n请更新前端配置！');
}

deployMetaStaking().catch(console.error);
