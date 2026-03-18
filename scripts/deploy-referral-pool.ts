import { ethers } from "hardhat"

async function main() {
  console.log("Deploying ReferralRewardPool...")

  const [deployer] = await ethers.getSigners()
  console.log("Deploying with account:", deployer.address)

  // 合约地址（来自环境变量：避免脚本写死导致部署到错误合约）
  const USDT_ADDRESS = process.env.USDT_ADDRESS || process.env.USDT_TOKEN_ADDRESS || ""
  const STAKING_CONTRACT = process.env.STAKING_CONTRACT_ADDRESS || process.env.STAKING_CONTRACT || ""
  if (!USDT_ADDRESS) throw new Error("Missing USDT_ADDRESS/USDT_TOKEN_ADDRESS in env")
  if (!STAKING_CONTRACT) throw new Error("Missing STAKING_CONTRACT_ADDRESS/STAKING_CONTRACT in env")

  // Gas 价格覆盖：确保在 0.013 BNB 预算下也可控
  const gasPriceGweiOverride = process.env.DEPLOY_GAS_PRICE_GWEI
    ? parseFloat(process.env.DEPLOY_GAS_PRICE_GWEI)
    : null
  const deployOverrides = gasPriceGweiOverride !== null
    ? { gasPrice: ethers.parseUnits(gasPriceGweiOverride.toString(), "gwei") }
    : undefined

  // 部署 ReferralRewardPool
  const ReferralRewardPool = await ethers.getContractFactory("ReferralRewardPool")
  const referralRewardPool = await ReferralRewardPool.deploy(
    USDT_ADDRESS,
    deployer.address, // admin
    deployOverrides
  )
  await referralRewardPool.waitForDeployment()
  const poolAddress = await referralRewardPool.getAddress()

  console.log("ReferralRewardPool deployed to:", poolAddress)

  // 设置质押合约地址
  console.log("Setting staking contract...")
  const tx1 = await referralRewardPool.setStakingContract(STAKING_CONTRACT, deployOverrides)
  await tx1.wait()
  console.log("Staking contract set")

  // 在 StakingContract 中设置推荐奖励池地址
  console.log("Setting referral reward pool in StakingContract...")
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT)
  const tx2 = await stakingContract.setReferralRewardPool(poolAddress, deployOverrides)
  await tx2.wait()
  console.log("Referral reward pool set in StakingContract")

  console.log("\n=== Deployment Summary ===")
  console.log("ReferralRewardPool:", poolAddress)
  console.log("Admin:", deployer.address)
  console.log("Staking Contract:", STAKING_CONTRACT)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
