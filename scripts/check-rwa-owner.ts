import { ethers } from 'hardhat';

async function main() {
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  const [deployer] = await ethers.getSigners();
  console.log('当前账户:', deployer.address);
  
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  const owner = await rwa.owner();
  console.log('RWA Owner:', owner);
  
  const balance = await rwa.balanceOf(owner);
  console.log('Owner RWA 余额:', ethers.formatEther(balance));
}

main().catch(console.error);
