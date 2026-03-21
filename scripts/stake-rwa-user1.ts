import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const stakingAddr = "0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB"
  const rwaAddr = "0x276C216D241856199A83bf27b2286659e5b877D3"
  
  const staking = await ethers.getContractAt("StakingContract", stakingAddr)
  const rwa = await ethers.getContractAt("MockERC20", rwaAddr)
  
  console.log("=== user1 质押 1000 RWA ===")
  
  // 授权
  await rwa.connect(user1).approve(stakingAddr, ethers.parseUnits("1000", 18))
  console.log("✅ 已授权")
  
  // 质押（灵活锁仓）
  await staking.connect(user1).stakeRWA(
    ethers.parseUnits("1000", 18),
    deployer.address, // referrer
    0 // 灵活锁仓
  )
  console.log("✅ 已质押 1000 RWA")
}

main().catch(console.error)
