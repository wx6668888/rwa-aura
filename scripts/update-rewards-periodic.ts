import { ethers } from 'hardhat'
import * as dotenv from 'dotenv'

dotenv.config()

/**
 * 定期更新所有用户的奖励（用于测试，模拟后端服务）
 * 使用方法: npx hardhat run scripts/update-rewards-periodic.ts --network localhost
 * 
 * 注意：这个脚本会计算所有活跃用户的收益并更新到合约
 */
async function main() {
  console.log('🚀 定期更新所有用户奖励...\n')

  const [deployer] = await ethers.getSigners()
  const stakingAddress = '0xFD471836031dc5108809D173A067e8486B9047A3'
  const StakingContract = await ethers.getContractFactory('StakingContract')
  const staking = StakingContract.attach(stakingAddress)

  // 检查后端地址
  const backendAddress = await staking.backendAddress()
  if (backendAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error('❌ 错误: 当前账户不是后端地址')
    console.error('   后端地址:', backendAddress)
    console.error('   当前账户:', deployer.address)
    console.error('   请使用后端地址的私钥运行此脚本')
    process.exit(1)
  }

  // 获取所有质押用户（这里简化处理，实际应该从数据库获取）
  // 为了测试，我们手动指定用户地址
  const userAddresses = [
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
  ]

  const rwaPrice = 0.85 // 假设 RWA 价格
  const dailyRate = 0.008 // 0.8% 日收益率
  const now = Math.floor(Date.now() / 1000)

  console.log('📋 处理用户列表:')
  for (const userAddress of userAddresses) {
    try {
      // 获取用户信息
      const stakeInfo = await staking.getUserStakeInfo(userAddress)
      const totalStaked = parseFloat(ethers.formatUnits(stakeInfo[0], 18))
      const currentRwaPending = parseFloat(ethers.formatUnits(stakeInfo[1], 18))
      const firstStakeTime = Number(stakeInfo[6])

      if (totalStaked === 0 || firstStakeTime === 0) {
        console.log(`  ⏭️  跳过 ${userAddress}: 未质押`)
        continue
      }

      // 计算收益
      const elapsedSeconds = Math.max(0, now - firstStakeTime)
      const elapsedDays = elapsedSeconds / 86400
      const dailyUSDTYield = totalStaked * dailyRate
      const dailyRWAYield = dailyUSDTYield / rwaPrice
      const totalRWAYield = dailyRWAYield * elapsedDays

      // 只更新新增的收益（避免重复计算）
      const newRWAYield = Math.max(0, totalRWAYield - currentRwaPending)

      if (newRWAYield < 0.0001) {
        console.log(`  ⏭️  跳过 ${userAddress}: 收益太小 (${newRWAYield.toFixed(6)} RWA)`)
        continue
      }

      console.log(`  📊 ${userAddress}:`)
      console.log(`     质押: ${totalStaked} USDT`)
      console.log(`     当前 RWA Pending: ${currentRwaPending.toFixed(2)} RWA`)
      console.log(`     新增收益: ${newRWAYield.toFixed(2)} RWA`)

      // 生成唯一的 stakeId
      const stakeId = BigInt(now) * 10000n + BigInt(userAddresses.indexOf(userAddress))

      // 转换为合约精度
      const rwaAmount = ethers.parseEther(newRWAYield.toFixed(18))
      const usdtAmount = ethers.parseEther('0') // 静态收益只有 RWA

      // 调用 updateUserRewards
      const tx = await staking.updateUserRewards(
        userAddress,
        rwaAmount,
        usdtAmount,
        stakeId
      )
      await tx.wait()

      // 验证
      const newStakeInfo = await staking.getUserStakeInfo(userAddress)
      const newRwaPending = parseFloat(ethers.formatUnits(newStakeInfo[1], 18))
      console.log(`     ✅ 更新成功! 新 RWA Pending: ${newRwaPending.toFixed(2)} RWA`)
      console.log('')

    } catch (error: any) {
      console.error(`  ❌ 处理 ${userAddress} 失败:`, error.message)
      console.log('')
    }
  }

  console.log('✅ 所有用户奖励更新完成!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
