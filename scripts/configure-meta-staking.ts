import { ethers } from 'hardhat';

async function configureMetaStaking() {
  const [deployer] = await ethers.getSigners();
  
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const NEW_STAKING = '0xaa2ba3E010545186bD4418B5d6acD687730627Ce';
  
  console.log('配置新 StakingContract...\n');
  
  const rwa = await ethers.getContractAt('RWAToken', RWA);
  
  console.log('添加到白名单...');
  await rwa.setWhitelist(NEW_STAKING, true);
  console.log('✅ 完成');
}

configureMetaStaking().catch(console.error);
