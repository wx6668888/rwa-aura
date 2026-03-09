import { ethers } from 'hardhat'

async function main() {
  console.log('🔍 检查提现余额数据来源...\n')

  // 获取账户
  const [deployer, user1] = await ethers.getSigners()
  const userAddress = user1.address
  
  console.log('📍 用户地址:', userAddress)
  console.log('   (应该是: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)\n')

  // 获取合约地址
  const STAKING_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  
  // 连接到质押合约
  const StakingContract = await ethers.getContractAt('StakingContract', STAKING_ADDRESS)
  
  console.log('📊 读取合约数据...\n')
  
  // 1. 读取 getUserStakeInfo
  const stakeInfo = await StakingContract.getUserStakeInfo(userAddress)
  console.log('1️⃣ getUserStakeInfo() 返回:')
  console.log('   totalStaked:', ethers.formatUnits(stakeInfo[0], 18), 'RWA')
  console.log('   rwaPending:', ethers.formatUnits(stakeInfo[1], 18), 'RWA')
  console.log('   usdtRewards:', ethers.formatUnits(stakeInfo[2], 18), 'USDT')
  console.log('   lastWithdrawTime:', stakeInfo[3].toString())
  console.log('   referrer:', stakeInfo[4])
  console.log('   nodeLevel:', stakeInfo[5].toString())
  console.log()
  
  // 2. 读取 getUserRewards
  const rewards = await StakingContract.getUserRewards(userAddress)
  console.log('2️⃣ getUserRewards() 返回:')
  console.log('   rwaPending:', ethers.formatUnits(rewards[0], 18), 'RWA')
  console.log('   usdtRewards:', ethers.formatUnits(rewards[1], 18), 'USDT')
  console.log()
  
  // 3. 读取 users mapping
  const userData = await StakingContract.users(userAddress)
  console.log('3️⃣ users mapping 返回:')
  console.log('   totalStaked:', ethers.formatUnits(userData[0], 18), 'USDT')
  console.log('   rwaPending:', ethers.formatUnits(userData[1], 18), 'RWA')
  console.log('   usdtRewards:', ethers.formatUnits(userData[2], 18), 'USDT')
  console.log('   lastWithdrawTime:', userData[3].toString())
  console.log('   referrer:', userData[4])
  console.log('   nodeLevel:', userData[5].toString())
  console.log('   firstStakeTime:', userData[6].toString())
  console.log()
  
  // 4. 计算实时收益
  const firstStakeTime = Number(userData[6])
  const totalStaked = parseFloat(ethers.formatUnits(userData[0], 18))
  const now = Math.floor(Date.now() / 1000)
  const elapsedSeconds = now - firstStakeTime
  const dailyRate = 0.008 // 0.8%
  const perSecondRate = dailyRate / 86400
  const totalEarnings = totalStaked * perSecondRate * elapsedSeconds
  
  console.log('4️⃣ 实时收益计算:')
  console.log('   质押金额:', totalStaked, 'USDT')
  console.log('   质押开始时间:', new Date(firstStakeTime * 1000).toLocaleString())
  console.log('   当前时间:', new Date(now * 1000).toLocaleString())
  console.log('   经过时间:', elapsedSeconds, '秒 (', Math.floor(elapsedSeconds / 3600), '小时)')
  console.log('   每秒收益率:', perSecondRate)
  console.log('   总收益:', totalEarnings.toFixed(6), 'RWA')
  console.log()
  
  console.log('📱 前端显示逻辑:')
  console.log('   提现页面的"持有"金额来自: userRewards.rwaPending')
  console.log('   当前值:', ethers.formatUnits(rewards[0], 18), 'RWA')
  console.log()
  console.log('   仪表板的"实时收益"来自: 基于 firstStakeTime 计算')
  console.log('   当前值:', totalEarnings.toFixed(6), 'RWA')
  console.log()
  
  console.log('✅ 数据验证完成！')
  console.log()
  console.log('💡 说明:')
  console.log('   - 提现页面显示的是合约中已经累积的 rwaPending')
  console.log('   - 仪表板显示的是基于质押时间实时计算的收益')
  console.log('   - 两者可能不同，因为合约的 rwaPending 需要通过后端服务定期更新')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
