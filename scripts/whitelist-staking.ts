import { ethers } from 'hardhat';

async function main() {
  const rwaAddress = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  const stakingAddress = '0x6140e7fAfcC48a6635d981202A7A9931C672772B';
  
  const rwa = await ethers.getContractAt('RWATokenWithPermit', rwaAddress);
  
  console.log('添加 StakingContract 到 RWA 白名单...');
  await rwa.addToWhitelist(stakingAddress);
  console.log('✅ 完成');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
