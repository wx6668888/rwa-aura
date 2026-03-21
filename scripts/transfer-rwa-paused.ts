import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  const [deployer] = await ethers.getSigners();
  console.log('从 Owner 转账 RWA...');
  
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  
  // 先暂停合约（如果有暂停功能）
  try {
    const pauseTx = await rwa.pause();
    await pauseTx.wait();
    console.log('✅ 合约已暂停（绕过交易限制）');
  } catch (e) {
    console.log('⚠️ 无法暂停或已暂停');
  }
  
  // 转账
  const amount = ethers.parseEther('50000');
  const tx = await rwa.transfer(testAddress, amount);
  await tx.wait();
  console.log('✅ 50,000 RWA 已发送');
  
  // 恢复合约
  try {
    const unpauseTx = await rwa.unpause();
    await unpauseTx.wait();
    console.log('✅ 合约已恢复');
  } catch (e) {
    console.log('⚠️ 无法恢复');
  }
}

main().catch(console.error);
