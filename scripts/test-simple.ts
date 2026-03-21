import { ethers } from 'hardhat';

async function simpleTest() {
  console.log('========== 简单功能测试 ==========\n');

  const [user] = await ethers.getSigners();
  
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const STAKING = '0xD2AA6CFC4409C8a7C2912B460DBC58f128D19246';

  const usdt = await ethers.getContractAt('TestUSDT', USDT);
  const staking = await ethers.getContractAt('StakingContract', STAKING);

  // USDT 质押
  console.log('【测试】USDT 质押 (200 USDT)');
  const amount = ethers.parseUnits('200', 6);
  await usdt.approve(STAKING, amount);
  console.log('✅ 授权');
  
  await staking.stake(amount, ethers.ZeroAddress, 90);
  console.log('✅ 质押成功 (90天锁仓)');

  const info = await staking.getUserStakeInfo(user.address);
  console.log('总质押:', ethers.formatEther(info[0]));

  console.log('\n✅ 测试完成！');
}

simpleTest().catch(console.error);
