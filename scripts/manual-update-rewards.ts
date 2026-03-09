import { ethers } from 'hardhat'
import * as dotenv from 'dotenv'

dotenv.config()

/**
 * 手动更新用户奖励（用于测试）
 * 使用方法: npx hardhat run scripts/manual-update-rewards.ts --network localhost
 */
async function main() {
  console.log('🚀 手动更新用户奖励...\n')

  const [deployer] = await ethers.getSigners()
  const userAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Account #1

  const stakingAddress = '0xFD471836031dc5108809D173A067e8486B9047A3'
  const StakingContract = await ethers.getContractFactory('StakingContract')
  const staking = StakingContract.attach(stakingAddress)

  // 获取用户信息
  const stakeInfo = await staking.getUserStakeInfo(userAddress)
  const totalStaked = parseFloat(ethers.formatUnits(stakeInfo[0], 18))
  const firstStakeTime = Number(stakeInfo[6])

  console.log('📊 用户信息:')
  console.log('  地址:', userAddress)
  console.log('  总质押:', totalStaked, 'USDT')
  console.log('  首次质押时间:', firstStakeTime)
  console.log('  首次质押时间 (Date):', new Date(firstStakeTime * 1000).toLocaleString())
  console.log('')

  if (totalStaked === 0) {
    console.log('❌ 用户还没有质押')
    return
  }

  // 计算收益
  const now = Math.floor(Date.now() / 1000)
  const elapsedSeconds = Math.max(0, now - firstStakeTime)
  const elapsedDays = elapsedSeconds / 86400

  // 每日收益 = 质押金额 × 0.8%
  const dailyRate = 0.008 // 0.8%
  const dailyUSDTYield = totalStaked * dailyRate
  const rwaPrice = 0.85 // 假设 RWA 价格
  const dailyRWAYield = dailyUSDTYield / rwaPrice

  // 总收益（按天数计算）
  const totalRWAYield = dailyRWAYield * elapsedDays

  console.log('💰 收益计算:')
  console.log('  经过秒数:', elapsedSeconds)
  console.log('  经过天数:', elapsedDays.toFixed(4))
  console.log('  每日 USDT 收益:', dailyUSDTYield.toFixed(2), 'USDT')
  console.log('  每日 RWA 收益:', dailyRWAYield.toFixed(2), 'RWA')
  console.log('  总 RWA 收益:', totalRWAYield.toFixed(2), 'RWA')
  console.log('')

  // 检查后端地址
  const backendAddress = await staking.backendAddress()
  console.log('🔐 后端地址:', backendAddress)
  console.log('  当前账户:', deployer.address)
  console.log('')

  if (backendAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log('⚠️  警告: 当前账户不是后端地址')
    console.log('   需要将后端地址设置为当前账户，或使用后端地址的私钥')
    console.log('')
    console.log('   解决方案:')
    console.log('   1. 在合约中设置后端地址为当前账户')
    console.log('   2. 或使用后端地址的私钥运行此脚本')
    console.log('')
    
    // 尝试设置后端地址（如果当前账户是 owner）
    try {
      console.log('   尝试设置后端地址...')
      const tx = await staking.setBackendAddress(deployer.address)
      await tx.wait()
      console.log('   ✅ 后端地址已设置为当前账户')
    } catch (error: any) {
      console.log('   ❌ 无法设置后端地址:', error.message)
      console.log('   请确保当前账户是合约 owner')
      return
    }
  }

  // 生成唯一的 stakeId（使用时间戳 + 随机数）
  const stakeId = BigInt(now) * 1000n + BigInt(Math.floor(Math.random() * 1000))

  // 转换为合约精度（18 decimals）
  const rwaAmount = ethers.parseEther(totalRWAYield.toFixed(18))
  const usdtAmount = ethers.parseEther('0') // 静态收益只有 RWA，没有 USDT

  console.log('📝 准备更新奖励:')
  console.log('  Stake ID:', stakeId.toString())
  console.log('  RWA 数量:', ethers.formatEther(rwaAmount), 'RWA')
  console.log('  USDT 数量:', ethers.formatEther(usdtAmount), 'USDT')
  console.log('')

  try {
    // 调用 updateUserRewards
    console.log('⏳ 调用 updateUserRewards...')
    const tx = await staking.updateUserRewards(
      userAddress,
      rwaAmount,
      usdtAmount,
      stakeId
    )
    console.log('  交易哈希:', tx.hash)
    await tx.wait()
    console.log('  ✅ 奖励更新成功!')
    console.log('')

    // 验证更新
    const newStakeInfo = await staking.getUserStakeInfo(userAddress)
    const newRwaPending = parseFloat(ethers.formatUnits(newStakeInfo[1], 18))
    console.log('✅ 验证结果:')
    console.log('  更新前 RWA Pending: 0.0 RWA')
    console.log('  更新后 RWA Pending:', newRwaPending.toFixed(2), 'RWA')
    console.log('')

  } catch (error: any) {
    console.error('❌ 更新失败:', error.message)
    if (error.message.includes('Only backend can call')) {
      console.error('   错误: 只有后端地址可以调用此函数')
      console.error('   请确保后端地址已设置为当前账户')
    }
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
