import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  console.log('添加地址到白名单:', testAddress);
  
  const [deployer] = await ethers.getSigners();
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  
  // 添加到白名单
  const whitelistTx = await rwa.setWhitelist(testAddress, true);
  await whitelistTx.wait();
  console.log('✅ 已加入白名单');
  
  // 转 RWA
  const amount = ethers.parseEther('50000');
  const transferTx = await rwa.transfer(testAddress, amount);
  await transferTx.wait();
  console.log('✅ 50,000 RWA 已发送');
  
  console.log('\n完成！');
}

main().catch(console.error);
