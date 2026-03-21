import { ethers } from 'hardhat';

async function main() {
  const NEW_USER = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  const USDT_ADDRESS = '0x8941dcEd13986E14566f62d7330ec3952Db95e19';
  const RWA_ADDRESS = '0x18f06E343E79fa515a408B3fA1bC336990BA4708';
  
  const [deployer] = await ethers.getSigners();
  
  const usdtAbi = ['function mint(address to, uint256 amount) external'];
  const rwaAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
  
  const usdt = new ethers.Contract(USDT_ADDRESS, usdtAbi, deployer);
  const rwa = new ethers.Contract(RWA_ADDRESS, rwaAbi, deployer);
  
  console.log('发送 100,000 USDT...');
  const tx1 = await usdt.mint(NEW_USER, ethers.parseUnits('100000', 6));
  await tx1.wait();
  console.log('✅ USDT 完成');
  
  console.log('发送 10,000 RWA...');
  const tx2 = await rwa.transfer(NEW_USER, ethers.parseUnits('10000', 18));
  await tx2.wait();
  console.log('✅ RWA 完成');
}

main().catch(console.error);
