import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  const POOL = "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD"
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 测试推荐奖励结算 ===\n")
  
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  
  // 查看待结算奖励
  console.log("1. 查看待结算奖励...")
  const [pending, withdrawable] = await pool.getPendingRewards(testAccount)
  console.log("待结算:", ethers.formatUnits(pending, 6), "USDT")
  console.log("可提取:", ethers.formatUnits(withdrawable, 6), "USDT\n")
  
  if (pending > 0) {
    console.log("2. 结算奖励（假设 L1 = 3%）...")
    await pool.settleWeeklyRewards([testAccount], [1])
    console.log("✅ 结算完成\n")
    
    const [pending2, withdrawable2] = await pool.getPendingRewards(testAccount)
    console.log("结算后:")
    console.log("待结算:", ethers.formatUnits(pending2, 6), "USDT")
    console.log("可提取:", ethers.formatUnits(withdrawable2, 6), "USDT")
  } else {
    console.log("没有待结算奖励")
  }
}

main().catch(console.error)
