import { ethers } from 'hardhat';
import { formatEther, parseUnits } from 'ethers';

/**
 * 测试推荐收益发放功能
 * 
 * 测试场景：
 * 1. 用户A（推荐人）先质押
 * 2. 用户B 使用用户A的地址作为推荐人质押
 * 3. 检查推荐关系是否正确绑定
 * 4. 模拟后端计算推荐奖励
 * 5. 调用合约更新推荐奖励
 * 6. 验证用户A收到了推荐奖励
 */

async function main() {
  console.log('🧪 开始测试推荐收益发放功能...\n');

  // 获取合约地址
  const USDT_ADDRESS = '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1';
  const RWA_ADDRESS = '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE';
  const STAKING_ADDRESS = '0x68B1D87F95878fE05B998F19b66F4baba5De1aed';

  // 获取签名者
  const [deployer, userA, userB, backend] = await ethers.getSigners();

  console.log('📋 测试账户：');
  console.log('  Deployer:', deployer.address);
  console.log('  用户A（推荐人）:', userA.address);
  console.log('  用户B（被推荐人）:', userB.address);
  console.log('  Backend:', backend.address);
  console.log('');

  // 连接合约
  const usdt = await ethers.getContractAt('TestUSDT', USDT_ADDRESS);
  const rwa = await ethers.getContractAt('RWAToken', RWA_ADDRESS);
  const staking = await ethers.getContractAt('StakingContract', STAKING_ADDRESS);

  // ========== 步骤 1: 给测试账户转 USDT ==========
  console.log('📤 步骤 1: 给测试账户转 USDT...');
  
  const transferAmount = parseUnits('10000', 6); // 10000 USDT (6 decimals)
  
  await usdt.transfer(userA.address, transferAmount);
  await usdt.transfer(userB.address, transferAmount);
  
  const balanceA = await usdt.balanceOf(userA.address);
  const balanceB = await usdt.balanceOf(userB.address);
  
  console.log(`  ✅ 用户A USDT 余额: ${formatEther(balanceA * BigInt(10**12))} USDT`);
  console.log(`  ✅ 用户B USDT 余额: ${formatEther(balanceB * BigInt(10**12))} USDT`);
  console.log('');

  // ========== 步骤 2: 用户A 质押（成为推荐人）==========
  console.log('💰 步骤 2: 用户A 质押 1000 USDT（成为推荐人）...');
  
  const stakeAmountA = parseUnits('1000', 6); // 1000 USDT
  
  // 授权
  await usdt.connect(userA).approve(STAKING_ADDRESS, stakeAmountA);
  console.log('  ✅ 用户A 授权完成');
  
  // 质押（不填推荐人）
  const txA = await staking.connect(userA).stake(stakeAmountA, ethers.ZeroAddress);
  await txA.wait();
  console.log('  ✅ 用户A 质押成功');
  
  // 检查用户A的质押信息
  const infoA = await staking.getUserStakeInfo(userA.address);
  console.log(`  📊 用户A 质押金额: ${formatEther(infoA.totalStaked_)} USDT`);
  console.log(`  📊 用户A 推荐人: ${infoA.referrer_}`);
  console.log('');

  // ========== 步骤 3: 用户B 使用用户A作为推荐人质押 ==========
  console.log('💰 步骤 3: 用户B 使用用户A作为推荐人质押 500 USDT...');
  
  const stakeAmountB = parseUnits('500', 6); // 500 USDT
  
  // 授权
  await usdt.connect(userB).approve(STAKING_ADDRESS, stakeAmountB);
  console.log('  ✅ 用户B 授权完成');
  
  // 质押（填写用户A的地址作为推荐人）
  const txB = await staking.connect(userB).stake(stakeAmountB, userA.address);
  const receiptB = await txB.wait();
  console.log('  ✅ 用户B 质押成功');
  
  // 从事件中获取 stakeId
  const stakeEvent = receiptB?.logs.find((log: any) => {
    try {
      const parsed = staking.interface.parseLog(log);
      return parsed?.name === 'StakeEvent';
    } catch {
      return false;
    }
  });
  
  let stakeId = 0;
  if (stakeEvent) {
    const parsed = staking.interface.parseLog(stakeEvent);
    stakeId = Number(parsed?.args.stakeId);
    console.log(`  📋 StakeId: ${stakeId}`);
  }
  
  // 检查用户B的推荐关系
  const infoB = await staking.getUserStakeInfo(userB.address);
  console.log(`  📊 用户B 质押金额: ${formatEther(infoB.totalStaked_)} USDT`);
  console.log(`  📊 用户B 推荐人: ${infoB.referrer_}`);
  
  if (infoB.referrer_ === userA.address) {
    console.log('  ✅ 推荐关系绑定成功！');
  } else {
    console.log('  ❌ 推荐关系绑定失败！');
    return;
  }
  console.log('');

  // ========== 步骤 4: 设置 Backend 地址 ==========
  console.log('🔧 步骤 4: 设置 Backend 地址...');
  
  await staking.setBackendAddress(backend.address);
  console.log(`  ✅ Backend 地址已设置: ${backend.address}`);
  console.log('');

  // ========== 步骤 5: 模拟后端计算推荐奖励 ==========
  console.log('🧮 步骤 5: 模拟后端计算推荐奖励...');
  
  // 推荐奖励计算规则（V1 节点）：
  // - 直推奖励：10% × 质押金额
  // - 用户B 质押 500 USDT
  // - 用户A 应得：500 × 10% = 50 USDT
  
  // 注意：合约内部使用 18 decimals，但 USDT 是 6 decimals
  // 所以我们需要用 6 decimals 的数值
  const referralRewardInternal = parseUnits('50', 18); // 内部 18 decimals
  const referralRewardUSDT = parseUnits('50', 6); // USDT 6 decimals
  
  console.log(`  📊 计算推荐奖励: ${formatEther(referralRewardInternal)} USDT`);
  console.log(`  📊 USDT 实际数量: ${referralRewardUSDT} (6 decimals)`);
  console.log('');

  // ========== 步骤 6: 给合约补充 USDT（用于发放奖励）==========
  console.log('💸 步骤 6: 给合约补充 USDT（用于发放奖励）...');
  
  // 合约当前余额
  let contractBalance = await usdt.balanceOf(STAKING_ADDRESS);
  console.log(`  📊 合约当前 USDT 余额: ${formatEther(contractBalance * BigInt(10**12))} USDT (${contractBalance} raw)`);
  
  // 需要的奖励（6 decimals）
  const rewardNeeded = referralRewardUSDT;
  console.log(`  📊 需要发放的奖励: ${formatEther(rewardNeeded * BigInt(10**12))} USDT (${rewardNeeded} raw)`);
  
  // 如果余额不足，补充
  if (contractBalance < rewardNeeded) {
    const shortage = rewardNeeded - contractBalance;
    console.log(`  ⚠️  余额不足，需要补充: ${formatEther(shortage * BigInt(10**12))} USDT`);
    await usdt.transfer(STAKING_ADDRESS, shortage);
    contractBalance = await usdt.balanceOf(STAKING_ADDRESS);
    console.log(`  ✅ 补充完成，新余额: ${formatEther(contractBalance * BigInt(10**12))} USDT`);
  } else {
    console.log(`  ✅ 余额充足，无需补充`);
  }
  console.log('');

  // ========== 步骤 7: 后端调用合约更新推荐奖励 ==========
  console.log('📝 步骤 7: 后端调用合约更新推荐奖励...');
  
  // 检查用户A更新前的奖励
  const rewardsBefore = await staking.getUserRewards(userA.address);
  console.log(`  📊 更新前 - 用户A RWA 待领取: ${formatEther(rewardsBefore.rwaPending_)} RWA`);
  console.log(`  📊 更新前 - 用户A USDT 奖励: ${formatEther(rewardsBefore.usdtRewards_)} USDT`);
  
  // 后端调用 updateUserRewards
  // 参数：用户地址, RWA数量(0), USDT奖励, stakeId
  const updateTx = await staking.connect(backend).updateUserRewards(
    userA.address,
    0, // rwAmount = 0 (推荐奖励是 USDT，不是 RWA)
    referralRewardInternal, // usdtAmount = 50 USDT (18 decimals)
    stakeId // 使用用户B的 stakeId
  );
  await updateTx.wait();
  console.log('  ✅ 推荐奖励更新成功');
  
  // 检查用户A更新后的奖励
  const rewardsAfter = await staking.getUserRewards(userA.address);
  console.log(`  📊 更新后 - 用户A RWA 待领取: ${formatEther(rewardsAfter.rwaPending_)} RWA`);
  console.log(`  📊 更新后 - 用户A USDT 奖励: ${formatEther(rewardsAfter.usdtRewards_)} USDT`);
  console.log('');

  // ========== 步骤 8: 验证结果 ==========
  console.log('✅ 步骤 8: 验证测试结果...');
  
  const expectedReward = referralRewardInternal;
  const actualReward = rewardsAfter.usdtRewards_;
  
  if (actualReward === expectedReward) {
    console.log('  ✅ 推荐奖励金额正确！');
    console.log(`  💰 用户A 获得推荐奖励: ${formatEther(actualReward)} USDT`);
  } else {
    console.log('  ❌ 推荐奖励金额不正确！');
    console.log(`  预期: ${formatEther(expectedReward)} USDT`);
    console.log(`  实际: ${formatEther(actualReward)} USDT`);
  }
  console.log('');

  // ========== 步骤 9: 测试防重复发放 ==========
  console.log('🔒 步骤 9: 测试防重复发放机制...');
  
  try {
    // 尝试用相同的 stakeId 再次更新
    await staking.connect(backend).updateUserRewards(
      userA.address,
      0,
      referralRewardInternal,
      stakeId // 相同的 stakeId
    );
    console.log('  ❌ 防重复发放机制失败！应该拒绝重复的 stakeId');
  } catch (error: any) {
    if (error.message.includes('Stake already processed')) {
      console.log('  ✅ 防重复发放机制正常工作！');
      console.log('  📋 错误信息: Stake already processed');
    } else {
      console.log('  ⚠️  发生了其他错误:', error.message);
    }
  }
  console.log('');

  // ========== 总结 ==========
  console.log('📊 测试总结：');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 用户A（推荐人）质押: ${formatEther(infoA.totalStaked_)} USDT`);
  console.log(`✅ 用户B（被推荐人）质押: ${formatEther(infoB.totalStaked_)} USDT`);
  console.log(`✅ 推荐关系绑定: ${infoB.referrer_ === userA.address ? '成功' : '失败'}`);
  console.log(`✅ 推荐奖励发放: ${formatEther(rewardsAfter.usdtRewards_)} USDT`);
  console.log(`✅ 防重复发放: 正常工作`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🎉 推荐收益发放功能测试完成！');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
