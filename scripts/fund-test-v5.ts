import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  
  const USDT = await ethers.getContractAt('TestUSDT', '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2');
  const RWA = await ethers.getContractAt('RWAToken', '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6');
  
  console.log('铸造 100,000 USDT...');
  await USDT.mint(testAddress, ethers.parseUnits('100000', 6));
  
  console.log('转账 10,000 RWA...');
  await RWA.transfer(testAddress, ethers.parseEther('10000'));
  
  console.log('✅ 完成！');
}

main().catch(console.error);
