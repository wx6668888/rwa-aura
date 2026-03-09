import { ethers } from 'hardhat'

/**
 * 获取当前部署的 TestUSDT 地址
 * 使用方法: npx hardhat run scripts/get-usdt-address.ts --network localhost
 */
async function main() {
  console.log('🔍 获取 TestUSDT 地址...\n')

  const network = await ethers.provider.getNetwork()
  console.log('🌐 当前网络 Chain ID:', network.chainId.toString())

  if (network.chainId !== 31337n) {
    console.error('❌ 此脚本仅用于本地 Hardhat 网络')
    process.exit(1)
  }

  // 从 StakingContract 获取 USDT 地址
  const stakingContractAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'
  console.log('📋 StakingContract 地址:', stakingContractAddress)

  try {
    const StakingContract = await ethers.getContractFactory('StakingContract')
    const stakingContract = StakingContract.attach(stakingContractAddress)
    
    const usdtTokenAddress = await stakingContract.usdtToken()
    console.log('✅ TestUSDT 地址:', usdtTokenAddress)
    console.log('')

    // 验证合约
    const TestUSDT = await ethers.getContractFactory('TestUSDT')
    const usdtToken = TestUSDT.attach(usdtTokenAddress)
    
    const name = await usdtToken.name()
    const symbol = await usdtToken.symbol()
    const decimals = await usdtToken.decimals()
    
    console.log('📦 TestUSDT 信息:')
    console.log('  名称:', name)
    console.log('  符号:', symbol)
    console.log('  精度:', decimals)
    console.log('')

    // 检查 Account #1 的余额
    const account1Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    const balance = await usdtToken.balanceOf(account1Address)
    console.log('💰 Account #1 余额:')
    console.log('  地址:', account1Address)
    console.log('  余额:', ethers.formatUnits(balance, decimals), symbol)
    console.log('')

    // 如果余额为 0，提示 mint
    if (balance === 0n) {
      console.log('⚠️  Account #1 余额为 0，需要 mint USDT')
      console.log('   运行: npx hardhat run scripts/mint-test-usdt.ts --network localhost')
    }

    // 输出前端配置
    console.log('📝 前端配置 (frontend/lib/contracts/addresses.ts):')
    console.log(`    usdtToken: '${usdtTokenAddress}',`)
    console.log('')

  } catch (error: any) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
