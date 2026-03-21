import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const POOL = "0x46b142DD1E924FAb83eCc3c08e4D46E82f005e0E"
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  
  console.log("=== 检查 user1 数据 ===\n")
  console.log("user1 地址:", user1.address)
  
  // 1. 检查推荐奖励
  const [pending, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("\n推荐奖励:")
  console.log("待结算:", ethers.formatUnits(pending, 6), "USDT")
  console.log("可提取:", ethers.formatUnits(withdrawable, 6), "USDT")
  
  // 2. 检查 RWA 收益
  const userInfo = await staking.users(user1.address)
  console.log("\nRWA 收益:")
  console.log("待提取:", ethers.formatUnits(userInfo.rwaPending, 18), "RWA")
  
  // 3. 检查质押信息
  console.log("\n质押信息:")
  console.log("总质押:", ethers.formatUnits(userInfo.totalStaked, 18), "USDT")
  console.log("推荐人:", userInfo.referrer)
  
  console.log("\n前端应该显示:")
  console.log("- 推荐奖励: $30.00")
  console.log("- RWA 收益: 0 RWA")
  console.log("- 总可提取: $30.00")
}

main().catch(console.error)
