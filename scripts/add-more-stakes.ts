import { ethers } from "hardhat"

async function main() {
  const [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  const POOL = "0x46b142DD1E924FAb83eCc3c08e4D46E82f005e0E"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 增加推荐奖励 ===\n")
  
  // 给更多用户转 USDT
  console.log("1. 准备更多测试账户...")
  await usdt.transfer(user3.address, ethers.parseUnits("5000", 6))
  await usdt.transfer(user4.address, ethers.parseUnits("5000", 6))
  await usdt.transfer(user5.address, ethers.parseUnits("5000", 6))
  console.log("✅ 已转账\n")
  
  // user3, user4, user5 都质押，推荐人是 user1
  console.log("2. 更多用户质押（推荐人: user1）...")
  
  await usdt.connect(user3).approve(STAKING, ethers.parseUnits("2000", 6))
  await staking.connect(user3).stake(ethers.parseUnits("2000", 6), user1.address, 0)
  console.log("✅ user3 质押 2000 USDT")
  
  await usdt.connect(user4).approve(STAKING, ethers.parseUnits("2000", 6))
  await staking.connect(user4).stake(ethers.parseUnits("2000", 6), user1.address, 0)
  console.log("✅ user4 质押 2000 USDT")
  
  await usdt.connect(user5).approve(STAKING, ethers.parseUnits("1000", 6))
  await staking.connect(user5).stake(ethers.parseUnits("1000", 6), user1.address, 0)
  console.log("✅ user5 质押 1000 USDT\n")
  
  // 查看待结算奖励
  const [pending, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("3. user1 待结算奖励:", ethers.formatUnits(pending, 6), "USDT\n")
  
  // 结算（假设 L1 = 3%）
  console.log("4. 结算奖励...")
  await pool.settleWeeklyRewards([user1.address], [1])
  console.log("✅ 结算完成\n")
  
  const [pending2, withdrawable2] = await pool.getPendingRewards(user1.address)
  console.log("5. 结算后可提取:", ethers.formatUnits(withdrawable2, 6), "USDT")
  console.log("总质押: 6000 USDT × 3% = 180 USDT")
}

main().catch(console.error)
