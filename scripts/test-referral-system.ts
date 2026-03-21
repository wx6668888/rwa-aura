import { ethers } from "hardhat"

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners()
  
  const USDT = "0x21dF544947ba3E8b3c32561399E88B52Dc8b2823"
  const RWA = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2"
  const STAKING = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43"
  const POOL = "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD"
  
  const usdt = await ethers.getContractAt("MockERC20", USDT)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 测试推荐奖励系统 ===\n")
  
  // 1. 给 user1 和 user2 铸造代币
  console.log("1. 铸造代币...")
  await usdt.mint(user1.address, ethers.parseUnits("10000", 6))
  await usdt.mint(user2.address, ethers.parseUnits("10000", 6))
  console.log("✅ 完成\n")
  
  // 2. user1 质押（无推荐人）
  console.log("2. user1 质押 1000 USDT...")
  await usdt.connect(user1).approve(STAKING, ethers.parseUnits("1000", 6))
  await staking.connect(user1).stake(ethers.parseUnits("1000", 6), ethers.ZeroAddress, 0)
  console.log("✅ 完成\n")
  
  // 3. user2 质押（推荐人：user1）
  console.log("3. user2 质押 1000 USDT（推荐人：user1）...")
  await usdt.connect(user2).approve(STAKING, ethers.parseUnits("1000", 6))
  await staking.connect(user2).stake(ethers.parseUnits("1000", 6), user1.address, 0)
  console.log("✅ 完成\n")
  
  // 4. 查看待结算奖励
  console.log("4. 查看 user1 的推荐奖励...")
  const pending = await pool.pendingRewards(0)
  console.log("待结算记录:", pending)
  
  const [pendingAmount, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("待结算金额:", ethers.formatUnits(pendingAmount, 6), "USDT")
  console.log("可提取金额:", ethers.formatUnits(withdrawable, 6), "USDT")
  
  console.log("\n=== 测试完成 ===")
}

main().catch(console.error)
