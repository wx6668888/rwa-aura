import { ethers } from 'hardhat';

async function testStaking() {
  console.log('========== 开始测试质押功能 ==========\n');

  const [user] = await ethers.getSigners();
  console.log('测试账户:', user.address);
  console.log('余额:', ethers.formatEther(await ethers.provider.getBalance(user.address)), 'BNB\n');

  // 合约地址（需要填写部署后的地址）
  const USDT_ADDRESS = '0x...';
  const RWA_ADDRESS = '0x...';
  const STAKING_ADDRESS = '0x...';

  // 连接合约
  const usdt = await ethers.getContractAt('TestUSDT', USDT_ADDRESS);
  const staking = await ethers.getContractAt('StakingContract', STAKING_ADDRESS);

  // 1. 检查余额
  console.log('1. 检查 USDT 余额...');
  const balance = await usdt.balanceOf(user.address);
  console.log('USDT 余额:', ethers.formatUnits(balance, 6));

  // 2. 授权
  console.log('\n2. 授权 USDT...');
  const amount = ethers.parseUnits('100', 6); // 100 USDT
  const approveTx = await usdt.approve(STAKING_ADDRESS, amount);
  await approveTx.wait();
  console.log('✅ 授权成功');

  // 3. 质押
  console.log('\n3. 质押 100 USDT...');
  const stakeTx = await staking.stake(
    amount,
    ethers.ZeroAddress, // 无推荐人
    0 // 灵活期
  );
  const receipt = await stakeTx.wait();
  console.log('✅ 质押成功, tx:', receipt?.hash);

  // 4. 查询质押信息
  console.log('\n4. 查询质押信息...');
  const stakeInfo = await staking.getUserStakeInfo(user.address);
  console.log('总质押:', ethers.formatEther(stakeInfo[0]));
  console.log('待领取 RWA:', ethers.formatEther(stakeInfo[1]));

  console.log('\n========== 测试完成 ==========');
}

testStaking().catch(console.error);
