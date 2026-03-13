import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  
  console.log("=== 给 user1 设置推荐人 ===\n")
  
  // user1 质押 100 USDT，推荐人是 deployer
  console.log("1. user1 质押 100 USDT（推荐人: deployer）...")
  console.log("deployer 地址:", deployer.address)
  
  await usdt.connect(user1).approve(STAKING, ethers.parseUnits("100", 6))
  await staking.connect(user1).stake(ethers.parseUnits("100", 6), deployer.address, 0)
  
  console.log("✅ 质押成功\n")
  
  // 检查推荐人
  const userInfo = await staking.users(user1.address)
  console.log("2. user1 的推荐人:", userInfo.referrer)
  console.log("总质押:", ethers.formatUnits(userInfo.totalStaked, 18), "USDT")
}

main().catch(console.error)
