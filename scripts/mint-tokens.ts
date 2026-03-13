import { ethers } from 'hardhat';

async function mintTokens() {
  const [deployer] = await ethers.getSigners();
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const usdt = await ethers.getContractAt('TestUSDT', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const rwa = await ethers.getContractAt('RWAToken', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  
  console.log('铸造代币给:', user);
  await usdt.mint(user, ethers.parseUnits('10000', 6));
  console.log('✅ 10000 USDT');
  
  const balance = await rwa.balanceOf(deployer.address);
  if (balance > 0n) {
    await rwa.transfer(user, ethers.parseEther('10000'));
    console.log('✅ 10000 RWA');
  }
  
  console.log('\n刷新页面查看余额！');
}

mintTokens().catch(console.error);
