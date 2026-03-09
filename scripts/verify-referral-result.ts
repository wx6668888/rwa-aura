import { ethers } from "hardhat";

async function main() {
  console.log("🔍 验证推荐功能结果\n");

  // 获取合约地址
  const STAKING_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDT_CONTRACT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // 获取账户
  const [deployer, account1] = await ethers.getSigners();

  console.log("📋 账户信息:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`质押账户 (Deployer): ${deployer.address}`);
  console.log(`推荐人 (Account #1): ${account1.address}\n`);

  // 获取合约实例
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT);
  const usdtContract = await ethers.getContractAt("TestUSDT", USDT_CONTRACT);

  // 1. 验证推荐关系
  console.log("🔗 推荐关系验证:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const deployerReferrer = await stakingContract.referrers(deployer.address);
    if (deployerReferrer === account1.address) {
      console.log(`✅ 推荐关系绑定成功！`);
      console.log(`   Deployer 的推荐人: ${deployerReferrer}`);
    } else if (deployerReferrer === ethers.ZeroAddress) {
      console.log(`❌ 推荐关系未绑定`);
    } else {
      console.log(`⚠️  推荐人地址不匹配: ${deployerReferrer}`);
    }
  } catch (error) {
    console.log(`❌ 无法读取推荐关系`);
  }

  // 2. 查询质押记录
  console.log("\n💰 质押记录查询:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const stakeCount = await stakingContract.getUserStakeCount(deployer.address);
    console.log(`质押记录数量: ${stakeCount}\n`);

    if (stakeCount > 0) {
      for (let i = 0; i < stakeCount; i++) {
        const stakeInfo = await stakingContract.getUserStakeInfo(deployer.address, i);
        console.log(`质押 #${i + 1}:`);
        console.log(`  金额: ${ethers.formatUnits(stakeInfo.amount, 6)} USDT`);
        console.log(`  锁仓期: ${stakeInfo.lockPeriod} 天`);
        console.log(`  状态: ${stakeInfo.active ? "活跃" : "已解锁"}`);
        
        const startTime = new Date(Number(stakeInfo.startTime) * 1000);
        const endTime = new Date(Number(stakeInfo.endTime) * 1000);
        console.log(`  开始时间: ${startTime.toLocaleString()}`);
        console.log(`  结束时间: ${endTime.toLocaleString()}\n`);
      }
    } else {
      console.log("⚠️  没有找到质押记录");
    }
  } catch (error: any) {
    console.log(`❌ 查询质押记录失败: ${error.message}`);
  }

  // 3. 查询推荐人的待提取奖励
  console.log("🎁 推荐人奖励查询:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const referrerRewards = await stakingContract.pendingWithdrawals(account1.address);
    console.log(`推荐人 (Account #1) 待提取奖励: ${ethers.formatUnits(referrerRewards, 6)} USDT`);
    
    if (referrerRewards > 0) {
      console.log(`✅ 推荐奖励已发放！`);
    } else {
      console.log(`⚠️  推荐奖励为 0，可能还未发放或已提取`);
    }
  } catch (error: any) {
    console.log(`❌ 查询推荐奖励失败: ${error.message}`);
  }

  // 4. 查询账户余额
  console.log("\n💵 账户余额:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const deployerBalance = await usdtContract.balanceOf(deployer.address);
  const account1Balance = await usdtContract.balanceOf(account1.address);
  
  console.log(`Deployer USDT 余额: ${ethers.formatUnits(deployerBalance, 6)} USDT`);
  console.log(`Account #1 USDT 余额: ${ethers.formatUnits(account1Balance, 6)} USDT`);

  // 5. 查询合约总质押量
  console.log("\n📊 合约统计:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const totalStaked = await stakingContract.totalStaked();
    console.log(`合约总质押量: ${ethers.formatUnits(totalStaked, 6)} USDT`);
  } catch (error: any) {
    console.log(`查询总质押量失败: ${error.message}`);
  }

  console.log("\n✅ 验证完成！");
  
  // 总结
  console.log("\n📝 测试总结:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. 推荐关系是否绑定成功");
  console.log("2. 质押记录是否正确");
  console.log("3. 推荐人是否收到奖励");
  console.log("4. 账户余额变化是否正确");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
