import { ethers } from "hardhat"

async function main() {
  console.log("Deploying ReferralRewardPool...")

  const [deployer] = await ethers.getSigners()
  console.log("Deploying with account:", deployer.address)

  // 合约地址（从之前的部署）
  const USDT_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
  const STAKING_CONTRACT = "0x0B306BF915C4d645ff596e518fAf3F9669b97016"

  // 部署 ReferralRewardPool
  const ReferralRewardPool = await ethers.getContractFactory("ReferralRewardPool")
  const referralRewardPool = await ReferralRewardPool.deploy(
    USDT_ADDRESS,
    deployer.address // admin
  )
  await referralRewardPool.waitForDeployment()
  const poolAddress = await referralRewardPool.getAddress()

  console.log("ReferralRewardPool deployed to:", poolAddress)

  // 设置质押合约地址
  console.log("Setting staking contract...")
  const tx1 = await referralRewardPool.setStakingContract(STAKING_CONTRACT)
  await tx1.wait()
  console.log("Staking contract set")

  // 在 StakingContract 中设置推荐奖励池地址
  console.log("Setting referral reward pool in StakingContract...")
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT)
  const tx2 = await stakingContract.setReferralRewardPool(poolAddress)
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
