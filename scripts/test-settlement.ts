import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const POOL = "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD"
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 测试每周结算 ===\n")
  
  // 结算 user1 的奖励（假设 user1 是 L1，奖励率 3%）
  console.log("1. 结算 user1 的推荐奖励（L1 = 3%）...")
  await pool.settleWeeklyRewards([user1.address], [1])
  console.log("✅ 结算完成\n")
  
  // 查看结算后的余额
  console.log("2. 查看 user1 的余额...")
  const [pending, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("待结算金额:", ethers.formatUnits(pending, 6), "USDT")
  console.log("可提取金额:", ethers.formatUnits(withdrawable, 6), "USDT")
  console.log("预期金额: 1000 × 3% = 30 USDT")
  
  console.log("\n=== 测试完成 ===")
}

main().catch(console.error)
