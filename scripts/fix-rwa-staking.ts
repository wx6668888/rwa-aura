import { ethers } from 'hardhat';

async function fixRWAStaking() {
  console.log('修复 RWA 质押配置...\n');

  const [deployer] = await ethers.getSigners();
  
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const STAKING = '0xD2AA6CFC4409C8a7C2912B460DBC58f128D19246';
  
  const rwa = await ethers.getContractAt('RWAToken', RWA);
  
  // 添加 Staking 到白名单
  console.log('添加 Staking 到白名单...');
  await rwa.setWhitelist(STAKING, true);
  console.log('✅ 完成');
  
  // 测试 RWA 质押
  console.log('\n测试 RWA 质押...');
  const amount = ethers.parseEther('200');
  await rwa.approve(STAKING, amount);
  
  const staking = await ethers.getContractAt('StakingContract', STAKING);
  await staking.stakeRWA(amount, ethers.ZeroAddress, 30);
  console.log('✅ RWA 质押成功！');
}

fixRWAStaking().catch(console.error);
