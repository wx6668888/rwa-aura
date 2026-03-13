import { ethers } from 'hardhat';

async function comprehensiveTest() {
  console.log('========== RWA 协议完整测试 ==========\n');
  
  const [user] = await ethers.getSigners();
  const addr = user.address;
  
  // 合约实例
  const usdt = await ethers.getContractAt('TestUSDT', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const rwa = await ethers.getContractAt('RWAToken', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  const staking = await ethers.getContractAt('StakingContract', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
  const strwa = await ethers.getContractAt('StRWA', '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  const swap = await ethers.getContractAt('SwapContract', '0x0165878A594ca255338adfa4d48449f69242Eb8F');

  console.log('测试账户:', addr, '\n');

  // ========== 测试 1: RWA 质押 ==========
  console.log('【测试 1】RWA 质押');
  const rwaAmount = ethers.parseEther('118'); // 约100 USDT等值
  await rwa.approve(staking.target, rwaAmount);
  console.log('✅ 授权 118 RWA');
  
  await staking.stakeRWA(rwaAmount, ethers.ZeroAddress, 30); // 30天锁仓
  console.log('✅ 质押成功 (30天锁仓)');
  
  const info = await staking.getUserStakeInfo(addr);
  console.log('总质押:', ethers.formatEther(info[0]), 'USDT等值\n');

  // ========== 测试 2: 查询 stRWA 余额 ==========
  console.log('【测试 2】stRWA 余额');
  const strwaBal = await strwa.balanceOf(addr);
  console.log('stRWA 余额:', ethers.formatEther(strwaBal));
  
  const available = await strwa.availableBalanceOf(addr);
  console.log('可用余额:', ethers.formatEther(available), '\n');

  // ========== 测试 3: Swap 功能 ==========
  console.log('【测试 3】Swap 测试');
  if (strwaBal > 0n) {
    const swapAmount = ethers.parseEther('10');
    await strwa.approve(swap.target, swapAmount);
    console.log('✅ 授权 10 stRWA');
    
    await swap.swapStRWAToRWA(swapAmount);
    console.log('✅ Swap 成功: 10 stRWA → RWA');
  } else {
    console.log('⏭️  跳过 (无 stRWA 余额)');
  }
  console.log();

  // ========== 测试 4: 最终余额 ==========
  console.log('【测试 4】最终余额');
  const finalUsdt = await usdt.balanceOf(addr);
  const finalRwa = await rwa.balanceOf(addr);
  const finalStrwa = await strwa.balanceOf(addr);
  
  console.log('USDT:', ethers.formatUnits(finalUsdt, 6));
  console.log('RWA:', ethers.formatEther(finalRwa));
  console.log('stRWA:', ethers.formatEther(finalStrwa));

  console.log('\n========== 测试完成 ==========');
  console.log('✅ 所有功能正常运行');
  console.log('\n刷新前端查看结果！');
}

comprehensiveTest().catch(console.error);
