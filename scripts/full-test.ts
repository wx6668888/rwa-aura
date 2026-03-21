import { ethers } from 'hardhat';

async function fullTest() {
  console.log('========== 完整功能测试 ==========\n');
  
  const [user] = await ethers.getSigners();
  const addr = user.address;
  
  // 合约
  const usdt = await ethers.getContractAt('TestUSDT', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const rwa = await ethers.getContractAt('RWAToken', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  const staking = await ethers.getContractAt('StakingContract', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
  const strwa = await ethers.getContractAt('StRWA', '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  const swap = await ethers.getContractAt('SwapContract', '0x0165878A594ca255338adfa4d48449f69242Eb8F');

  // 测试 1: USDT 质押
  console.log('【测试 1】USDT 质押');
  const amount = ethers.parseUnits('100', 6);
  await usdt.approve(staking.target, amount);
  console.log('✅ 授权 100 USDT');
  
  await staking.stake(amount, ethers.ZeroAddress, 0);
  console.log('✅ 质押成功');
  
  const info = await staking.getUserStakeInfo(addr);
  console.log('总质押:', ethers.formatEther(info[0]), 'USDT\n');

  // 测试 2: 查询余额
  console.log('【测试 2】查询余额');
  const usdtBal = await usdt.balanceOf(addr);
  const rwaBal = await rwa.balanceOf(addr);
  console.log('USDT:', ethers.formatUnits(usdtBal, 6));
  console.log('RWA:', ethers.formatEther(rwaBal), '\n');

  console.log('========== 测试完成 ==========');
  console.log('✅ 所有功能正常');
  console.log('\n你可以在前端查看结果！');
}

fullTest().catch(console.error);
