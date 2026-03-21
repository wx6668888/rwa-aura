import { ethers } from "hardhat";

async function main() {
  console.log("🔍 检查推荐关系和质押状态\n");

  const STAKING_CONTRACT = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const USDT_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const [deployer, account1] = await ethers.getSigners();

  console.log("📋 账户信息:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`质押账户 (Deployer): ${deployer.address}`);
  console.log(`推荐人 (Account #1): ${account1.address}\n`);

  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT);
  const usdtContract = await ethers.getContractAt("TestUSDT", USDT_CONTRACT);

  // 1. 检查推荐关系
  console.log("🔗 推荐关系检查:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const referralInfo = await stakingContract.getReferralInfo(deployer.address);
    const referrer = referralInfo[0];
    const hasReferrer = referralInfo[1];
    
    if (hasReferrer && referrer === account1.address) {
      console.log(`✅ 推荐关系绑定成功！`);
      console.log(`   推荐人: ${referrer}`);
    } else if (hasReferrer) {
      console.log(`⚠️  推荐人地址不匹配`);
      console.log(`   期望: ${account1.address}`);
      console.log(`   实际: ${referrer}`);
    } else {
      console.log(`❌ 推荐关系未绑定`);
    }
  } catch (error: any) {
    console.log(`❌ 无法读取推荐关系: ${error.message}`);
  }

  // 2. 查询质押信息
  console.log("\n💰 质押信息查询:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const stakeInfo = await stakingContract.getUserStakeInfo(deployer.address);
    const totalStaked = stakeInfo[0];
    const rwaPending = stakeInfo[1];
    const usdtRewards = stakeInfo[2];
    const lastWithdrawTime = stakeInfo[3];
    const referrer = stakeInfo[4];
    const nodeLevel = stakeInfo[5];
    const firstStakeTime = stakeInfo[6];
    
    console.log(`总质押金额: ${ethers.formatUnits(totalStaked, 18)} (内部精度)`);
    console.log(`待提取 RWA: ${ethers.formatUnits(rwaPending, 18)} RWA`);
    console.log(`USDT 奖励: ${ethers.formatUnits(usdtRewards, 18)} (内部精度)`);
    console.log(`节点等级: L${nodeLevel}`);
    console.log(`推荐人: ${referrer}`);
    
    if (firstStakeTime > 0) {
      const firstStakeDate = new Date(Number(firstStakeTime) * 1000);
      console.log(`首次质押时间: ${firstStakeDate.toLocaleString()}`);
    }
    
    if (totalStaked > 0) {
      console.log(`\n✅ 质押成功！`);
    } else {
      console.log(`\n⚠️  未找到质押记录`);
    }
  } catch (error: any) {
    console.log(`❌ 查询质押信息失败: ${error.message}`);
  }

  // 3. 查询锁仓本金
  console.log("\n🔒 锁仓本金查询:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const lockedPrincipals = await stakingContract.getUSDTLockedPrincipals(deployer.address);
    const stakeIds = lockedPrincipals[0];
    const amounts = lockedPrincipals[1];
    const lockStartTimes = lockedPrincipals[2];
    const lockEndTimes = lockedPrincipals[3];
    const canWithdraw = lockedPrincipals[4];
    const isWithdrawn = lockedPrincipals[5];
    
    if (stakeIds.length > 0) {
      console.log(`锁仓记录数量: ${stakeIds.length}\n`);
      
      for (let i = 0; i < stakeIds.length; i++) {
        console.log(`锁仓 #${i + 1}:`);
        console.log(`  Stake ID: ${stakeIds[i]}`);
        console.log(`  金额: ${ethers.formatUnits(amounts[i], 18)} (内部精度)`);
        
        const startDate = new Date(Number(lockStartTimes[i]) * 1000);
        const endDate = new Date(Number(lockEndTimes[i]) * 1000);
        console.log(`  开始时间: ${startDate.toLocaleString()}`);
        console.log(`  结束时间: ${endDate.toLocaleString()}`);
        console.log(`  可提取: ${canWithdraw[i] ? "是" : "否"}`);
        console.log(`  已提取: ${isWithdrawn[i] ? "是" : "否"}\n`);
      }
    } else {
      console.log("没有锁仓记录");
    }
  } catch (error: any) {
    console.log(`查询锁仓本金失败: ${error.message}`);
  }

  // 4. 查询灵活本金
  console.log("💵 灵活本金查询:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const flexiblePrincipal = await stakingContract.usdtFlexiblePrincipal(deployer.address);
    const flexibleTotalStaked = await stakingContract.usdtFlexibleTotalStaked(deployer.address);
    
    console.log(`灵活本金 (合约侧50%): ${ethers.formatUnits(flexiblePrincipal, 18)} (内部精度)`);
    console.log(`灵活总质押: ${ethers.formatUnits(flexibleTotalStaked, 18)} (内部精度)`);
  } catch (error: any) {
    console.log(`查询灵活本金失败: ${error.message}`);
  }

  // 5. 查询账户余额
  console.log("\n💳 账户余额:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const deployerBalance = await usdtContract.balanceOf(deployer.address);
  const account1Balance = await usdtContract.balanceOf(account1.address);
  
  console.log(`Deployer USDT 余额: ${ethers.formatUnits(deployerBalance, 6)} USDT`);
  console.log(`Account #1 USDT 余额: ${ethers.formatUnits(account1Balance, 6)} USDT`);

  // 6. 查询合约统计
  console.log("\n📊 合约统计:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const totalStaked = await stakingContract.getTotalStaked();
    console.log(`合约总质押量: ${ethers.formatUnits(totalStaked, 18)} (内部精度)`);
  } catch (error: any) {
    console.log(`查询总质押量失败: ${error.message}`);
  }

  console.log("\n✅ 检查完成！");
  
  console.log("\n📝 总结:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. 推荐关系是否正确绑定");
  console.log("2. 质押记录是否存在");
  console.log("3. 锁仓/灵活本金状态");
  console.log("4. 账户余额变化");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
