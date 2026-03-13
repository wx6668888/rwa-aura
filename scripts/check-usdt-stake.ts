import { ethers } from "hardhat"

async function main() {
  const user1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  
  const staking = await ethers.getContractAt("StakingContract", "0xB2b580ce436E6F77A5713D80887e14788Ef49c9A")
  
  console.log("=== user1 USDT 质押信息 ===")
  const userInfo = await staking.users(user1)
  
  console.log("totalStaked (raw):", userInfo.totalStaked.toString())
  console.log("totalStaked (USDT):", ethers.formatUnits(userInfo.totalStaked, 6))
  console.log("rwaPending:", ethers.formatUnits(userInfo.rwaPending, 18))
}

main().catch(console.error)
