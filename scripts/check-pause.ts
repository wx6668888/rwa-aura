import { ethers } from 'hardhat';

async function main() {
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  
  const paused = await rwa.paused();
  console.log('合约是否暂停:', paused);
  
  if (paused) {
    console.log('\n尝试解除暂停...');
    const tx = await rwa.unpause();
    await tx.wait();
    console.log('✅ 已解除暂停');
  }
}

main().catch(console.error);
