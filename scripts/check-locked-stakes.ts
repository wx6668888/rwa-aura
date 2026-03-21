import { ethers } from "hardhat"

async function main() {
  const user1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  
  const staking = await ethers.getContractAt("StakingContract", "0xB0f05d25e41FbC2b52013099ED9616f1206Ae21B")
  
  console.log("=== user1 锁仓信息 ===")
  const result = await staking.getRWALockedPrincipals(user1)
  
  const [stakeIds, amounts, lockStartTimes, lockEndTimes, canWithdraw, isWithdrawn] = result
  
  console.log("锁仓数量:", stakeIds.length)
  
  for (let i = 0; i < stakeIds.length; i++) {
    console.log(`\n锁仓 #${i + 1}:`)
    console.log("  stakeId:", stakeIds[i].toString())
    console.log("  amount:", ethers.formatUnits(amounts[i], 18), "RWA")
    console.log("  lockStartTime:", new Date(Number(lockStartTimes[i]) * 1000).toLocaleString())
    console.log("  lockEndTime:", new Date(Number(lockEndTimes[i]) * 1000).toLocaleString())
    console.log("  canWithdraw:", canWithdraw[i])
    console.log("  isWithdrawn:", isWithdrawn[i])
  }
}

main().catch(console.error)
