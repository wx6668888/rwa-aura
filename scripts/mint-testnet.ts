import { ethers } from 'hardhat';

async function mintTestnet() {
  const [deployer] = await ethers.getSigners();
  const user = deployer.address;
  
  console.log('铸造代币给:', user);
  
  const usdt = await ethers.getContractAt('TestUSDT', '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c');
  const rwa = await ethers.getContractAt('RWAToken', '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be');
  
  await usdt.mint(user, ethers.parseUnits('10000', 6));
  console.log('✅ 10000 USDT');
  
  const balance = await rwa.balanceOf(deployer.address);
  if (balance > 0n) {
    await rwa.transfer(user, ethers.parseEther('10000'));
    console.log('✅ 10000 RWA');
  }
  
  console.log('\n完成！刷新前端查看余额');
}

mintTestnet().catch(console.error);
