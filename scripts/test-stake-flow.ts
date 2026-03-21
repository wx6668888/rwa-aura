import { ethers } from "hardhat"

async function main() {
  const [deployer, user1] = await ethers.getSigners()
  
  const USDT = "0xD84379CEae14AA33C123Af12424A37803F885889"
  const STAKING = "0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d"
  
  const usdt = await ethers.getContractAt("TestUSDT", USDT)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  
  console.log("=== 测试质押流程 ===\n")
  
  // 1. 检查余额
  const balance = await usdt.balanceOf(user1.address)
  console.log("1. user1 USDT 余额:", ethers.formatUnits(balance, 6))
  
  // 2. 检查授权
  const allowance = await usdt.allowance(user1.address, STAKING)
  console.log("2. 授权额度:", ethers.formatUnits(allowance, 6), "\n")
  
  // 3. 授权
  if (allowance < ethers.parseUnits("1000", 6)) {
    console.log("3. 授权 1000 USDT...")
    await usdt.connect(user1).approve(STAKING, ethers.parseUnits("1000", 6))
    console.log("✅ 授权成功\n")
  }
  
  // 4. 质押
  console.log("4. 质押 1000 USDT...")
  try {
    const tx = await staking.connect(user1).stake(
      ethers.parseUnits("1000", 6),
      deployer.address,
      0 // flexible
    )
    console.log("交易哈希:", tx.hash)
    
    const receipt = await tx.wait()
    console.log("✅ 质押成功\n")
    console.log("Gas 使用:", receipt.gasUsed.toString())
  } catch (error: any) {
    console.error("❌ 质押失败:", error.message)
  }
}

main().catch(console.error)
