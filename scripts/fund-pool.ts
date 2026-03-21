import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const POOL = "0x46b142DD1E924FAb83eCc3c08e4D46E82f005e0E"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  
  console.log("=== 给推荐奖励池转 USDT ===\n")
  
  const amount = ethers.parseUnits("10000", 6)
  await usdt.transfer(POOL, amount)
  
  console.log("✅ 已转账 10,000 USDT 到推荐奖励池")
  
  const balance = await usdt.balanceOf(POOL)
  console.log("奖励池余额:", ethers.formatUnits(balance, 6), "USDT")
}

main().catch(console.error)
