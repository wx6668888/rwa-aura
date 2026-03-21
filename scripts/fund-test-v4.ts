import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  const testAddress = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  
  console.log('Deployer:', deployer.address);
  console.log('Deployer balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB');
  
  const USDT = await ethers.getContractAt('TestUSDT', '0x76111CD7aaF75651554EeAAFe76284Bcc42A0e21');
  const RWA = await ethers.getContractAt('RWAToken', '0x3DC063DF28ABe73553032A458F2fa26325c972f1');
  
  console.log('\n铸造 100,000 USDT...');
  const tx1 = await USDT.mint(testAddress, ethers.parseUnits('100000', 6));
  await tx1.wait();
  console.log('✅ USDT 已发送');
  
  console.log('\n检查 deployer RWA 余额...');
  const deployerRWA = await RWA.balanceOf(deployer.address);
  console.log('Deployer RWA:', ethers.formatEther(deployerRWA));
  
  if (deployerRWA >= ethers.parseEther('10000')) {
    console.log('\n转账 10,000 RWA...');
    const tx2 = await RWA.transfer(testAddress, ethers.parseEther('10000'));
    await tx2.wait();
    console.log('✅ RWA 已发送');
  } else {
    console.log('⚠️ Deployer RWA 余额不足');
  }
  
  console.log('\n✅ 完成！');
}

main().catch(console.error);
