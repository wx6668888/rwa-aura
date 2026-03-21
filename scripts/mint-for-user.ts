import { ethers } from 'hardhat';

async function mintForUser() {
  const [deployer] = await ethers.getSigners();
  const targetUser = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  console.log('给', targetUser, '发放代币...\n');
  
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  
  const usdt = await ethers.getContractAt('TestUSDT', USDT);
  const rwa = await ethers.getContractAt('RWAToken', RWA);
  
  // 铸造 USDT
  await usdt.mint(targetUser, ethers.parseUnits('10000', 6));
  console.log('✅ 10000 USDT');
  
  // 转账 RWA
  await rwa.transfer(targetUser, ethers.parseEther('10000'));
  console.log('✅ 10000 RWA');
  
  console.log('\n完成！');
}

mintForUser().catch(console.error);
