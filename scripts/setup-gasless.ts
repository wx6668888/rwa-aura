import { ethers } from 'hardhat';

async function setupGasless() {
  const [deployer] = await ethers.getSigners();
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const USDT = '0x365c4BE974f7c429De4B7133c61e8B04Cf6C28DA';
  const STAKING = '0xD130d5DAadD8Bfb3E15c51786f40B262bE2E7fCA';
  
  const usdt = await ethers.getContractAt('TestUSDTWithPermit', USDT);
  
  console.log('铸造 USDT...');
  await usdt.mint(user, ethers.parseUnits('10000', 6));
  console.log('✅ 10000 USDT');
  
  console.log('\n完成！用户可以完全 gasless 质押');
}

setupGasless().catch(console.error);
