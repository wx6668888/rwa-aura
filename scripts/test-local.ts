import { ethers } from 'hardhat';

async function testStaking() {
  console.log('========== 测试质押功能 ==========\n');

  const [user] = await ethers.getSigners();
  console.log('测试账户:', user.address);

  // 合约地址
  const USDT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const STAKING = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

  const usdt = await ethers.getContractAt('TestUSDT', USDT);
  const staking = await ethers.getContractAt('StakingContract', STAKING);

  // 1. 铸造测试 USDT
  console.log('1. 铸造 1000 USDT...');
  await usdt.mint(user.address, ethers.parseUnits('1000', 6));
  const balance = await usdt.balanceOf(user.address);
  console.log('✅ USDT 余额:', ethers.formatUnits(balance, 6));

  // 2. 授权
  console.log('\n2. 授权 100 USDT...');
  const amount = ethers.parseUnits('100', 6);
  await usdt.approve(STAKING, amount);
  console.log('✅ 授权成功');

  // 3. 质押
  console.log('\n3. 质押 100 USDT...');
  const tx = await staking.stake(amount, ethers.ZeroAddress, 0);
  await tx.wait();
  console.log('✅ 质押成功');

  // 4. 查询
  console.log('\n4. 查询质押信息...');
  const info = await staking.getUserStakeInfo(user.address);
  console.log('总质押:', ethers.formatEther(info[0]));

  console.log('\n========== 测试完成 ==========');
}

testStaking().catch(console.error);
