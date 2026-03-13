import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  const USDT = "0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3"
  const RWA = "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0"
  const STAKING = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650"
  
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  
  const usdt = await ethers.getContractAt("MockERC20", USDT)
  const rwa = await ethers.getContractAt("MockERC20", RWA)
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  
  console.log("=== 准备测试账户 ===\n")
  
  // 1. 铸造代币
  console.log("1. 铸造 10,000 USDT 和 10,000 RWA...")
  await usdt.mint(testAccount, ethers.parseUnits("10000", 6))
  await rwa.mint(testAccount, ethers.parseUnits("10000", 18))
  console.log("✅ 代币铸造完成\n")
  
  // 2. 授权
  console.log("2. 授权质押合约...")
  await usdt.approve(STAKING, ethers.parseUnits("10000", 6))
  await rwa.approve(STAKING, ethers.parseUnits("10000", 18))
  console.log("✅ 授权完成\n")
  
  // 3. 质押 RWA
  console.log("3. 质押 10,000 RWA...")
  await staking.stakeRWA(ethers.parseUnits("10000", 18), ethers.ZeroAddress, 0)
  console.log("✅ RWA 质押完成\n")
  
  // 4. 质押 USDT
  console.log("4. 质押 1,000 USDT...")
  await staking.stake(ethers.parseUnits("1000", 6), ethers.ZeroAddress, 0)
  console.log("✅ USDT 质押完成\n")
  
  console.log("=== 测试账户准备完成 ===")
  console.log("账户地址:", testAccount)
  console.log("现在可以在前端查看数据了！")
}

main().catch(console.error)
