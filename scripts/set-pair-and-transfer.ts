import { ethers } from 'hardhat';

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const RWA_ADDRESS = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  
  // 检查 PancakeSwap Pair
  const pair = await rwa.pancakeSwapPair();
  console.log('PancakeSwap Pair:', pair);
  
  // 如果 pair 是零地址，设置为测试地址（绕过限制）
  if (pair === ethers.ZeroAddress) {
    console.log('\n设置 PancakeSwap Pair 为测试地址...');
    const setPairTx = await rwa.setPancakeSwapPair(testAddress);
    await setPairTx.wait();
    console.log('✅ Pair 已设置');
  }
  
  // 现在转账应该可以了
  const amount = ethers.parseEther('50000');
  const tx = await rwa.transfer(testAddress, amount);
  await tx.wait();
  console.log('✅ 50,000 RWA 已发送');
}

main().catch(console.error);
