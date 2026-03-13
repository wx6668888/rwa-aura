import { ethers } from 'hardhat';

async function main() {
  const NEW_USER = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  
  const [deployer] = await ethers.getSigners();
  console.log('部署者地址:', deployer.address);
  
  // 新合约地址
  const USDT_ADDRESS = '0x129efE4e01f5e58425D60c8A32e350756083C8E7';
  const RWA_ADDRESS = '0xA0752C967DDF5B52Af5bb80BdE1eF376Bc48DBb8';
  
  const usdtAbi = ['function mint(address to, uint256 amount) external'];
  const rwaAbi = ['function mint(address to, uint256 amount) external'];
  
  const usdt = new ethers.Contract(USDT_ADDRESS, usdtAbi, deployer);
  const rwa = new ethers.Contract(RWA_ADDRESS, rwaAbi, deployer);
  
  console.log('\n发送测试币...');
  
  // 发送 100,000 USDT
  const usdtAmount = ethers.parseUnits('100000', 6);
  const tx1 = await usdt.mint(NEW_USER, usdtAmount);
  await tx1.wait();
  console.log('✅ 发送 100,000 USDT');
  
  // 发送 10,000 RWA
  const rwaAmount = ethers.parseUnits('10000', 18);
  const tx2 = await rwa.mint(NEW_USER, rwaAmount);
  await tx2.wait();
  console.log('✅ 发送 10,000 RWA');
  
  console.log('\n完成！现在可以用新地址测试了。');
}

main().catch(console.error);
