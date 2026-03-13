import { ethers } from "hardhat"

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners()
  
  const USDT_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
  const STAKING_CONTRACT = "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
  const REFERRAL_POOL = "0x4826533B4897376654Bb4d4AD88B7faFD0C98528"
  
  const usdt = await ethers.getContractAt("MockERC20", USDT_ADDRESS)
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT)
  
  console.log("=== 测试推荐奖励 ===\n")
  
  // 1. 给合约转一些 USDT 用于支付推荐奖励
  console.log("1. 给合约转 USDT...")
  const transferTx = await usdt.transfer(STAKING_CONTRACT, ethers.parseUnits("10000", 6))
  await transferTx.wait()
  console.log("✅ 已转 10,000 USDT 到合约\n")
  
  // 2. user1 质押（作为推荐人）
  console.log("2. user1 质押 1000 USDT（无推荐人）...")
  const approveTx1 = await usdt.connect(user1).approve(STAKING_CONTRACT, ethers.parseUnits("1000", 6))
  await approveTx1.wait()
  
  const stakeTx1 = await stakingContract.connect(user1).stake(
    ethers.parseUnits("1000", 6),
    ethers.ZeroAddress,
    0
  )
  await stakeTx1.wait()
  console.log("✅ user1 质押成功\n")
  
  // 3. 检查 user1 等级
  const user1Info = await stakingContract.users(user1.address)
  console.log("user1 等级:", user1Info.nodeLevel.toString())
  console.log("user1 地址:", user1.address, "\n")
  
  // 4. user2 质押（user1 作为推荐人）
  console.log("3. user2 质押 1000 USDT（推荐人：user1）...")
  const mintTx = await usdt.mint(user2.address, ethers.parseUnits("1000", 6))
  await mintTx.wait()
  
  const approveTx2 = await usdt.connect(user2).approve(STAKING_CONTRACT, ethers.parseUnits("1000", 6))
  await approveTx2.wait()
  
  console.log("推荐奖励池地址:", REFERRAL_POOL)
  console.log("合约中设置的推荐奖励池:", await stakingContract.referralRewardPool())
  
  const stakeTx2 = await stakingContract.connect(user2).stake(
    ethers.parseUnits("1000", 6),
    user1.address, // 推荐人
    0
  )
  const receipt = await stakeTx2.wait()
  console.log("✅ user2 质押成功\n")
  
  // 5. 检查推荐奖励池余额
  const referralPool = await ethers.getContractAt("ReferralRewardPool", REFERRAL_POOL)
  const user1Balance = await referralPool.rewardBalances(user1.address)
  console.log("4. user1 推荐奖励余额:", ethers.formatUnits(user1Balance, 6), "USDT")
  
  // 6. 检查推荐记录
  const recordCount = await referralPool.getReferralRecordCount(user1.address)
  console.log("user1 推荐记录数:", recordCount.toString())
  
  if (recordCount > 0n) {
    const records = await referralPool.getReferralRecords(user1.address, 0, 1)
    console.log("\n推荐记录详情:")
    console.log("- 被推荐人:", records[0].referee)
    console.log("- 质押金额:", ethers.formatUnits(records[0].stakeAmount, 6), "USDT")
    console.log("- 奖励金额:", ethers.formatUnits(records[0].rewardAmount, 6), "USDT")
    console.log("- 推荐人等级:", records[0].userLevel.toString())
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
