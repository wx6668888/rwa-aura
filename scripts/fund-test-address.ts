import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  console.log('给测试地址发币:', testAddress);
  
  // BSC Testnet 合约地址
  const USDT_ADDRESS = '0x365c4BE974f7c429De4B7133c61e8B04Cf6C28DA';
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  const [deployer] = await ethers.getSigners();
  console.log('操作账户:', deployer.address);
  
  // Mint USDT
  const usdt = await ethers.getContractAt('TestUSDT', USDT_ADDRESS);
  const usdtTx = await usdt.mint(testAddress, ethers.parseUnits('100000', 6));
  await usdtTx.wait();
  console.log('✅ 100,000 USDT 已发送');
  
  // 转 RWA
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  const deployerBalance = await rwa.balanceOf(deployer.address);
  
  if (deployerBalance > 0n) {
    const amount = ethers.parseEther('50000');
    if (deployerBalance >= amount) {
      const rwaTx = await rwa.transfer(testAddress, amount);
      await rwaTx.wait();
      console.log('✅ 50,000 RWA 已发送');
    } else {
      console.log('⚠️ 部署者 RWA 余额不足:', ethers.formatEther(deployerBalance));
    }
  } else {
    console.log('⚠️ 部署者没有 RWA');
  }
  
  console.log('\n完成！');
}

main().catch(console.error);
