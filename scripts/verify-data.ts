import { ethers } from "hardhat"

async function main() {
  const STAKING = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650"
  const REFERRAL_POOL = "0xc351628EB244ec633d5f21fBD6621e1a683B1181"
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  const pool = await ethers.getContractAt("ReferralRewardPool", REFERRAL_POOL)
  
  console.log("=== 验证链上数据 ===\n")
  
  // 1. USDT 质押
  const userInfo = await staking.users(testAccount)
  console.log("USDT 质押:", ethers.formatUnits(userInfo.totalStaked, 18), "USDT")
  console.log("节点等级:", userInfo.nodeLevel.toString())
  
  // 2. RWA 质押
  const rwaInfo = await staking.rwaStakes(testAccount)
  console.log("RWA 质押:", ethers.formatUnits(rwaInfo.totalStakedRWA, 18), "RWA")
  
  // 3. 推荐奖励余额
  const balance = await pool.rewardBalances(testAccount)
  console.log("推荐奖励余额:", ethers.formatUnits(balance, 6), "USDT")
  
  // 4. 推荐记录
  const count = await pool.getReferralRecordCount(testAccount)
  console.log("推荐记录数:", count.toString())
  
  console.log("\n✅ 数据验证完成！")
}

main().catch(console.error)
