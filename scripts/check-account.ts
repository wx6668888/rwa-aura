import { ethers } from "hardhat"

async function main() {
  const STAKING = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43"
  const POOL = "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD"
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  
  const staking = await ethers.getContractAt("StakingContract", STAKING)
  const pool = await ethers.getContractAt("ReferralRewardPool", POOL)
  
  console.log("=== 检查账户状态 ===\n")
  
  // 1. 检查质押信息
  const userInfo = await staking.users(testAccount)
  console.log("1. USDT 质押:")
  console.log("总质押:", ethers.formatUnits(userInfo.totalStaked, 18), "USDT")
  console.log("推荐人:", userInfo.referrer)
  console.log("等级:", userInfo.nodeLevel.toString(), "\n")
  
  // 2. 检查 RWA 质押
  const rwaInfo = await staking.rwaStakes(testAccount)
  console.log("2. RWA 质押:")
  console.log("总质押:", ethers.formatUnits(rwaInfo.totalStakedRWA, 18), "RWA")
  console.log("推荐人:", rwaInfo.referrer, "\n")
  
  // 3. 检查推荐奖励池
  const pendingCount = await pool.pendingRewards(0).catch(() => null)
  console.log("3. 推荐奖励池:")
  console.log("待结算记录数:", pendingCount ? "有记录" : "无记录")
  
  const [pending, withdrawable] = await pool.getPendingRewards(testAccount)
  console.log("待结算金额:", ethers.formatUnits(pending, 6), "USDT")
  console.log("可提取金额:", ethers.formatUnits(withdrawable, 6), "USDT")
}

main().catch(console.error)
