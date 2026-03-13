import { ethers } from 'hardhat';

async function main() {
  const RWA = await ethers.getContractAt('RWAToken', '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6');
  const Staking = await ethers.getContractAt('StakingContract', '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE');
  
  console.log('检查 RWA 暂停状态...');
  const paused = await RWA.paused();
  console.log('暂停:', paused);
  
  console.log('\n检查 Staking 合约白名单...');
  const isWhitelisted = await RWA.whitelist(Staking.getAddress());
  console.log('Staking 白名单:', isWhitelisted);
  
  if (paused) {
    console.log('\n解除暂停...');
    await RWA.unpause();
  }
  
  if (!isWhitelisted) {
    console.log('\n添加 Staking 到白名单...');
    await RWA.setWhitelist(await Staking.getAddress(), true);
  }
  
  console.log('\n✅ 完成');
}

main().catch(console.error);
