import { ethers } from 'hardhat'

async function main() {
  console.log('🔍 调试提现页面数据...\n')

  const [deployer] = await ethers.getSigners()
  console.log('测试地址:', deployer.address)

  // 获取合约
  const stakingAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  const StakingContract = await ethers.getContractAt('StakingContract', stakingAddress)

  // 读取用户奖励
  const rewards = await StakingContract.getUserRewards(deployer.address)
  console.log('\n📊 getUserRewards() 返回:')
  console.log('  rwaPending:', ethers.formatUnits(rewards[0], 18), 'RWA')
  console.log('  usdtRewards:', ethers.formatUnits(rewards[1], 18), 'USDT')

  // 读取用户质押信息
  const stakeInfo = await StakingContract.getUserStakeInfo(deployer.address)
  console.log('\n📊 getUserStakeInfo() 返回:')
  console.log('  totalStaked:', ethers.formatUnits(stakeInfo[0], 18), 'RWA')
  console.log('  rwaPending:', ethers.formatUnits(stakeInfo[1], 18), 'RWA')
  console.log('  usdtRewards:', ethers.formatUnits(stakeInfo[2], 18), 'USDT')
  console.log('  lastWithdrawTime:', stakeInfo[3].toString())
  console.log('  referrer:', stakeInfo[4])
  console.log('  nodeLevel:', stakeInfo[5].toString())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
