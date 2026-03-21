import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  
  console.log("=== 模拟 RWA 收益 ===\n")
  
  // 直接给 user1 增加 RWA 收益（模拟每日收益累积）
  console.log("1. 增加 user1 的 RWA 收益...")
  
  // 使用 owner 权限直接修改（仅测试用）
  // 实际应该等待时间累积收益
  const amount = ethers.parseUnits("100", 18) // 100 RWA
  
  // 检查当前收益
  const userInfo = await staking.users(user1.address)
  console.log("当前 RWA 收益:", ethers.formatUnits(userInfo.rwaPending, 18), "RWA\n")
  
  console.log("提示: 需要等待时间累积收益，或手动调用合约增加收益")
  console.log("user1 地址:", user1.address)
}

main().catch(console.error)
