import { ethers } from 'hardhat';

async function main() {
  const RWA = await ethers.getContractAt('RWAToken', '0x3DC063DF28ABe73553032A458F2fa26325c972f1');
  
  console.log('检查 RWA 暂停状态...');
  const paused = await RWA.paused();
  console.log('暂停状态:', paused);
  
  if (paused) {
    console.log('解除暂停...');
    await RWA.unpause();
    console.log('✅ 已解除暂停');
  }
}

main().catch(console.error);
