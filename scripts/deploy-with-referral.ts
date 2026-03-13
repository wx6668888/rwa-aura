import { ethers } from "hardhat"

async function main() {
  console.log("=== 重新部署合约（包含推荐奖励功能）===\n")

  const [deployer] = await ethers.getSigners()
  console.log("部署账户:", deployer.address)

  // 1. 部署 Mock USDT
  console.log("\n1. 部署 USDT...")
  const MockERC20 = await ethers.getContractFactory("MockERC20")
  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6)
  await usdt.waitForDeployment()
  const usdtAddress = await usdt.getAddress()
  console.log("USDT:", usdtAddress)

  // 2. 部署 RWA
  console.log("\n2. 部署 RWA...")
  const rwa = await MockERC20.deploy("RWA Token", "RWA", 18)
  await rwa.waitForDeployment()
  const rwaAddress = await rwa.getAddress()
  console.log("RWA:", rwaAddress)

  // 3. 部署 StakingContract
  console.log("\n3. 部署 StakingContract...")
  const StakingContract = await ethers.getContractFactory("StakingContract")
  const stakingContract = await StakingContract.deploy(
    usdtAddress,
    rwaAddress,
    deployer.address, // treasury
    deployer.address  // backend
  )
  await stakingContract.waitForDeployment()
  const stakingAddress = await stakingContract.getAddress()
  console.log("StakingContract:", stakingAddress)

  // 4. 部署 ReferralRewardPool
  console.log("\n4. 部署 ReferralRewardPool...")
  const ReferralRewardPool = await ethers.getContractFactory("ReferralRewardPool")
  const referralPool = await ReferralRewardPool.deploy(usdtAddress, deployer.address)
  await referralPool.waitForDeployment()
  const poolAddress = await referralPool.getAddress()
  console.log("ReferralRewardPool:", poolAddress)

  // 5. 配置
  console.log("\n5. 配置合约...")
  await referralPool.setStakingContract(stakingAddress)
  console.log("✅ ReferralPool 设置质押合约")
  
  await stakingContract.setReferralRewardPool(poolAddress)
  console.log("✅ StakingContract 设置推荐奖励池")

  // 6. 铸造代币
  console.log("\n6. 铸造测试代币...")
  await usdt.mint(deployer.address, ethers.parseUnits("100000", 6))
  await rwa.mint(deployer.address, ethers.parseUnits("100000", 18))
  console.log("✅ 已铸造 100,000 USDT 和 100,000 RWA")

  // 7. 给合约转 USDT（用于支付推荐奖励）
  await usdt.transfer(stakingAddress, ethers.parseUnits("50000", 6))
  console.log("✅ 已转 50,000 USDT 到质押合约")

  console.log("\n=== 部署完成 ===")
  console.log("USDT:", usdtAddress)
  console.log("RWA:", rwaAddress)
  console.log("StakingContract:", stakingAddress)
  console.log("ReferralRewardPool:", poolAddress)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
