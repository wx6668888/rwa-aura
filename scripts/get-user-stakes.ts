import { ethers } from 'hardhat'

/**
 * 获取用户的所有质押记录（从事件中）
 * 使用方法: npx hardhat run scripts/get-user-stakes.ts --network localhost
 */
async function main() {
  console.log('🔍 获取用户质押记录...\n')

  const userAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  const stakingAddress = '0xFD471836031dc5108809D173A067e8486B9047A3'

  const StakingContract = await ethers.getContractFactory('StakingContract')
  const staking = StakingContract.attach(stakingAddress)

  // 获取 StakeEvent 事件
  const filter = staking.filters.StakeEvent(userAddress)
  const events = await staking.queryFilter(filter)

  console.log(`📊 找到 ${events.length} 笔质押记录:\n`)

  let totalAmount = 0n
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const args = event.args as any
    
    const amount = args[1] // amount (18 decimals)
    const stakeId = args[3] // stakeId
    const timestamp = Number(args[4]) // timestamp
    
    const amountInUSDT = parseFloat(ethers.formatUnits(amount, 18))
    totalAmount += amount
    
    console.log(`  质押 #${i + 1}:`)
    console.log(`    Stake ID: ${stakeId.toString()}`)
    console.log(`    金额: ${amountInUSDT.toFixed(2)} USDT`)
    console.log(`    时间: ${new Date(timestamp * 1000).toLocaleString()}`)
    console.log(`    经过时间: ${Math.floor((Date.now() / 1000 - timestamp) / 86400)} 天`)
    console.log('')
  }

  console.log(`总计: ${parseFloat(ethers.formatUnits(totalAmount, 18)).toFixed(2)} USDT`)
  console.log('')

  // 获取用户信息
  const stakeInfo = await staking.getUserStakeInfo(userAddress)
  console.log('📋 用户信息:')
  console.log(`  总质押: ${ethers.formatUnits(stakeInfo[0], 18)} USDT`)
  console.log(`  RWA Pending: ${ethers.formatUnits(stakeInfo[1], 18)} RWA`)
  console.log(`  首次质押时间: ${new Date(Number(stakeInfo[6]) * 1000).toLocaleString()}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 错误:', error)
    process.exit(1)
  })
