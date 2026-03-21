import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const USDT_ADDRESS = '0x365c4BE974f7c429De4B7133c61e8B04Cf6C28DA';
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  console.log('查询地址余额:', testAddress);
  
  const usdt = await ethers.getContractAt('TestUSDT', USDT_ADDRESS);
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  
  const usdtBalance = await usdt.balanceOf(testAddress);
  const rwaBalance = await rwa.balanceOf(testAddress);
  
  console.log('\nUSDT 余额:', ethers.formatUnits(usdtBalance, 6));
  console.log('RWA 余额:', ethers.formatEther(rwaBalance));
}

main().catch(console.error);
