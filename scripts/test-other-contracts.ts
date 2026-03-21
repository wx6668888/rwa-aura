import { ethers } from 'hardhat';

async function testOtherContracts() {
  console.log('========== 测试其他合约 ==========\n');

  const [user] = await ethers.getSigners();
  
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const STRWA = '0xfF1C231c2810F58BD568252B74557b2Df242d209';
  const SWAP = '0x2Ca00C9D6e1d304317a40Efe09CB426cE2B43567';
  const LOTTERY = '0x6Af75b424281B115cBB4c605F69AebB86227dC3C';

  const usdt = await ethers.getContractAt('TestUSDT', USDT);
  const rwa = await ethers.getContractAt('RWAToken', RWA);
  const strwa = await ethers.getContractAt('StRWA', STRWA);
  const swap = await ethers.getContractAt('SwapContract', SWAP);

  // 测试 1: Swap 功能 (需要先有 stRWA)
  console.log('【测试 1】Swap 功能');
  const strwaBal = await strwa.balanceOf(user.address);
  console.log('stRWA 余额:', ethers.formatEther(strwaBal));
  
  if (strwaBal > 0n) {
    const swapAmount = ethers.parseEther('10');
    await strwa.approve(SWAP, swapAmount);
    await swap.swapStRWAToRWA(swapAmount);
    console.log('✅ Swap 成功');
  } else {
    console.log('⏭️  跳过 (无 stRWA)');
  }

  // 测试 2: 彩票合约
  console.log('\n【测试 2】彩票合约');
  const lottery = await ethers.getContractAt('LotteryContractSimple', LOTTERY);
  
  const weeklyPool = await lottery.getCurrentPoolInfo(0);
  console.log('周奖池:', ethers.formatEther(weeklyPool[1]));
  
  console.log('\n========== 测试完成 ==========');
}

testOtherContracts().catch(console.error);
