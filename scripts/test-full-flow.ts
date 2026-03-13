import { ethers } from "hardhat"

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  const POOL = "0x46b142DD1E924FAb83eCc3c08e4D46E82f005e0E"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 完整测试流程 ===\n")
  
  // 1. 给测试账户转 USDT
  console.log("1. 准备测试账户...")
  await usdt.transfer(user1.address, ethers.parseUnits("10000", 6))
  await usdt.transfer(user2.address, ethers.parseUnits("10000", 6))
  console.log("✅ 已转账 10,000 USDT 给 user1 和 user2\n")
  
  // 2. user1 质押（无推荐人）
  console.log("2. user1 质押 1000 USDT（无推荐人）...")
  await usdt.connect(user1).approve(STAKING, ethers.parseUnits("1000", 6))
  await staking.connect(user1).stake(ethers.parseUnits("1000", 6), ethers.ZeroAddress, 0)
  console.log("✅ user1 质押成功\n")
  
  // 3. user2 质押（推荐人是 user1）
  console.log("3. user2 质押 1000 USDT（推荐人: user1）...")
  await usdt.connect(user2).approve(STAKING, ethers.parseUnits("1000", 6))
  await staking.connect(user2).stake(ethers.parseUnits("1000", 6), user1.address, 0)
  console.log("✅ user2 质押成功\n")
  
  // 4. 查看推荐奖励
  console.log("4. 查看 user1 的推荐奖励...")
  const [pending, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("待结算:", ethers.formatUnits(pending, 6), "USDT")
  console.log("可提取:", ethers.formatUnits(withdrawable, 6), "USDT\n")
  
  // 5. 结算奖励（假设 user1 是 L1 = 3%）
  console.log("5. 结算 user1 的推荐奖励（L1 = 3%）...")
  await pool.settleWeeklyRewards([user1.address], [1])
  console.log("✅ 结算完成\n")
  
  // 6. 查看结算后的余额
  console.log("6. 查看结算后的余额...")
  const [pending2, withdrawable2] = await pool.getPendingRewards(user1.address)
  console.log("待结算:", ethers.formatUnits(pending2, 6), "USDT")
  console.log("可提取:", ethers.formatUnits(withdrawable2, 6), "USDT\n")
  
  console.log("=== 测试完成 ===")
  console.log("\n现在可以在前端测试提现功能：")
  console.log("1. 刷新 http://localhost:3000/withdraw")
  console.log("2. 连接钱包（使用 user1 地址）")
  console.log("3. 查看推荐奖励余额")
  console.log("4. 提取推荐奖励")
}

main().catch(console.error)
