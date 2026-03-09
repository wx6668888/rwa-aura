import { ethers } from 'hardhat';
import { formatUnits } from 'ethers';

/**
 * 调试仪表板数据显示问题
 * 检查账户 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 的：
 * 1. 链上数据（合约直接读取）
 * 2. 前端显示逻辑
 * 3. 团队总质押 vs 个人总质押
 */

async function main() {
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  console.log('='.repeat(80));
  console.log('仪表板数据调试');
  console.log('='.repeat(80));
  console.log(`测试地址: ${testAddress}`);
  console.log('');

  // 获取合约实例
  const StakingContract = await ethers.getContractAt(
    'StakingContract',
    '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
  );

  console.log('1. 链上数据（StakingContract）');
  console.log('-'.repeat(80));

  // 获取 USDT 质押信息
  const userStakeInfo = await StakingContract.getUserStakeInfo(testAddress);
  console.log('USDT 质押信息 (getUserStakeInfo):');
  console.log(`  - totalStaked: ${formatUnits(userStakeInfo[0], 18)} USDT`);
  console.log(`  - rwaPending: ${formatUnits(userStakeInfo[1], 18)} RWA`);
  console.log(`  - usdtRewards: ${formatUnits(userStakeInfo[2], 18)} USDT`);
  console.log(`  - lastWithdrawTime: ${userStakeInfo[3]}`);
  console.log(`  - referrer: ${userStakeInfo[4]}`);
  console.log(`  - nodeLevel: ${userStakeInfo[5]}`);
  console.log(`  - firstStakeTime: ${userStakeInfo[6]}`);
  console.log('');

  // 获取 RWA 质押信息
  const rwaStakeInfo = await StakingContract.rwaStakes(testAddress);
  console.log('RWA 质押信息 (rwaStakes):');
  console.log(`  - totalStakedRWA: ${formatUnits(rwaStakeInfo[0], 18)} RWA`);
  console.log(`  - rwaPending: ${formatUnits(rwaStakeInfo[1], 18)} RWA`);
  console.log(`  - lastWithdrawTime: ${rwaStakeInfo[2]}`);
  console.log(`  - referrer: ${rwaStakeInfo[3]}`);
  console.log(`  - firstStakeTime: ${rwaStakeInfo[4]}`);
  console.log(`  - nodeLevel: ${rwaStakeInfo[5]}`);
  console.log(`  - isActive: ${rwaStakeInfo[6]}`);
  console.log('');

  // 计算个人总质押（前端逻辑）
  const usdtStaked = parseFloat(formatUnits(userStakeInfo[0], 18));
  const rwaStaked = parseFloat(formatUnits(rwaStakeInfo[0], 18));
  const rwaPrice = 0.85;
  const rwaStakedInUSDT = rwaStaked * rwaPrice;
  const personalTotalStaked = usdtStaked + rwaStakedInUSDT;

  console.log('2. 前端计算（个人总质押）');
  console.log('-'.repeat(80));
  console.log(`  - USDT 质押: ${usdtStaked.toFixed(2)} USDT`);
  console.log(`  - RWA 质押: ${rwaStaked.toFixed(2)} RWA`);
  console.log(`  - RWA 转 USDT (×0.85): ${rwaStakedInUSDT.toFixed(2)} USDT`);
  console.log(`  - 个人总质押: ${personalTotalStaked.toFixed(2)} USDT`);
  console.log('');

  console.log('3. 问题分析');
  console.log('-'.repeat(80));
  console.log('前端 stat-cards.tsx 中的问题：');
  console.log('');
  console.log('代码片段:');
  console.log('  const teamVolume = isConnected ? totalStaked.toLocaleString(...) : "0"');
  console.log('');
  console.log('问题：');
  console.log('  - "团队总质押" 显示的是 totalStaked（个人 USDT + RWA 质押）');
  console.log('  - 这实际上是"个人总质押"，不是"团队总质押"');
  console.log('  - 团队总质押应该包括：个人质押 + 所有下级的质押');
  console.log('');
  console.log('当前显示值:');
  console.log(`  - 团队总质押（错误）: ${personalTotalStaked.toFixed(0)} USDT`);
  console.log(`  - 个人总质押（正确）: ${personalTotalStaked.toFixed(0)} USDT`);
  console.log('');

  // 检查推荐关系
  console.log('4. 推荐关系检查');
  console.log('-'.repeat(80));
  
  try {
    // 查询 ReferralBound 事件
    const filter = StakingContract.filters.ReferralBound(testAddress);
    const events = await StakingContract.queryFilter(filter, 0, 'latest');
    
    if (events.length > 0) {
      console.log(`找到 ${events.length} 个推荐绑定事件:`);
      for (const event of events) {
        const args = event.args as any;
        console.log(`  - 用户: ${args.user}`);
        console.log(`  - 推荐人: ${args.referrer}`);
        console.log(`  - 区块: ${event.blockNumber}`);
      }
    } else {
      console.log('未找到推荐绑定事件');
    }
  } catch (error) {
    console.log('查询推荐事件失败:', error);
  }
  console.log('');

  // 检查是否有下级
  console.log('5. 下级质押检查');
  console.log('-'.repeat(80));
  
  try {
    // 查询以该地址为推荐人的质押事件
    const stakeFilter = StakingContract.filters.StakeEvent(null, null, testAddress);
    const stakeEvents = await StakingContract.queryFilter(stakeFilter, 0, 'latest');
    
    const rwaStakeFilter = StakingContract.filters.RWAStakeEvent(null, null, testAddress);
    const rwaStakeEvents = await StakingContract.queryFilter(rwaStakeFilter, 0, 'latest');
    
    console.log(`下级 USDT 质押事件: ${stakeEvents.length} 个`);
    console.log(`下级 RWA 质押事件: ${rwaStakeEvents.length} 个`);
    
    let teamTotalUSDT = 0;
    
    if (stakeEvents.length > 0) {
      console.log('\nUSDT 质押详情:');
      for (const event of stakeEvents) {
        const args = event.args as any;
        const amount = parseFloat(formatUnits(args.amount, 18));
        teamTotalUSDT += amount;
        console.log(`  - 用户: ${args.user}`);
        console.log(`    金额: ${amount.toFixed(2)} USDT`);
        console.log(`    锁仓期: ${args.lockPeriod} 天`);
      }
    }
    
    if (rwaStakeEvents.length > 0) {
      console.log('\nRWA 质押详情:');
      for (const event of rwaStakeEvents) {
        const args = event.args as any;
        const amount = parseFloat(formatUnits(args.amount, 18));
        const usdtEquiv = amount * rwaPrice;
        teamTotalUSDT += usdtEquiv;
        console.log(`  - 用户: ${args.user}`);
        console.log(`    金额: ${amount.toFixed(2)} RWA (${usdtEquiv.toFixed(2)} USDT)`);
        console.log(`    锁仓期: ${args.lockPeriod} 天`);
      }
    }
    
    console.log('');
    console.log(`下级总质押: ${teamTotalUSDT.toFixed(2)} USDT`);
    console.log(`团队总质押（个人+下级）: ${(personalTotalStaked + teamTotalUSDT).toFixed(2)} USDT`);
    
  } catch (error) {
    console.log('查询下级质押失败:', error);
  }
  console.log('');

  console.log('6. 修复建议');
  console.log('-'.repeat(80));
  console.log('需要修改 frontend/components/dashboard/stat-cards.tsx:');
  console.log('');
  console.log('方案 1: 从后端 API 获取团队数据');
  console.log('  - 调用 /api/user/:address/level-info 获取 teamVolume');
  console.log('  - 该接口返回团队总质押（包括个人+所有下级）');
  console.log('');
  console.log('方案 2: 从链上查询推荐关系并汇总');
  console.log('  - 查询所有以该地址为推荐人的质押事件');
  console.log('  - 递归查询多级下级（如果需要）');
  console.log('  - 汇总所有下级的质押金额');
  console.log('');
  console.log('推荐使用方案 1，因为后端已经维护了团队数据');
  console.log('='.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
