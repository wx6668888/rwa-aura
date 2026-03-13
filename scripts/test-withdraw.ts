import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const POOL = "0x46b142DD1E924FAb83eCc3c08e4D46E82f005e0E"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 测试推荐奖励提现 ===\n")
  
  // 1. 查看提现前余额
  const balanceBefore = await usdt.balanceOf(user1.address)
  console.log("1. 提现前 USDT 余额:", ethers.formatUnits(balanceBefore, 6))
  
  const [pending, withdrawable] = await pool.getPendingRewards(user1.address)
  console.log("可提取推荐奖励:", ethers.formatUnits(withdrawable, 6), "USDT\n")
  
  // 2. 提现 100 USDT
  console.log("2. 提现 100 USDT...")
  const tx = await pool.connect(user1).withdraw(ethers.parseUnits("100", 6))
  await tx.wait()
  console.log("✅ 提现成功\n")
  
  // 3. 查看提现后余额
  const balanceAfter = await usdt.balanceOf(user1.address)
  console.log("3. 提现后 USDT 余额:", ethers.formatUnits(balanceAfter, 6))
  
  const [pending2, withdrawable2] = await pool.getPendingRewards(user1.address)
  console.log("剩余可提取:", ethers.formatUnits(withdrawable2, 6), "USDT")
  
  const received = balanceAfter - balanceBefore
  console.log("\n实际到账:", ethers.formatUnits(received, 6), "USDT")
  console.log("扣除手续费:", ethers.formatUnits(ethers.parseUnits("100", 6) - received, 6), "USDT (8%)")
}

main().catch(console.error)
