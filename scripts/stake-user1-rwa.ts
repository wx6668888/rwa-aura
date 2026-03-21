import { ethers } from "hardhat"

async function main() {
  const user1PrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  const user1 = new ethers.Wallet(user1PrivateKey, ethers.provider)
  
  const rwa = await ethers.getContractAt("MockERC20", "0x276C216D241856199A83bf27b2286659e5b877D3")
  const staking = await ethers.getContractAt("StakingContract", "0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB")
  
  console.log("=== user1 质押 RWA ===")
  
  // 授权
  const amount = ethers.parseUnits("1000", 18)
  await rwa.connect(user1).approve(staking.target, amount)
  console.log("✅ 已授权")
  
  // 质押（灵活锁仓）
  const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  await staking.connect(user1).stakeRWA(amount, deployer, 0)
  console.log("✅ 已质押 1000 RWA（灵活锁仓）")
}

main().catch(console.error)
