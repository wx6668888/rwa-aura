import { ethers } from 'hardhat'

/**
 * 查询指定地址的所有当前质押记录（StakeEvent + RWAStakeEvent）
 * 使用: npx hardhat run scripts/check-address-stakes.ts --network localhost
 */
async function main() {
  const TARGET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  const stakingAddress = process.env.STAKING_CONTRACT || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'

  console.log('🔍 查询地址:', TARGET_ADDRESS)
  console.log('   质押合约:', stakingAddress)
  console.log('')

  const StakingContract = await ethers.getContractFactory('StakingContract')
  const staking = StakingContract.attach(stakingAddress) as any

  const normalized = TARGET_ADDRESS.toLowerCase()

  // 查询 USDT 质押事件 StakeEvent(user, ..., stakeId, timestamp, lockPeriod)
  const stakeFilter = staking.filters.StakeEvent(TARGET_ADDRESS)
  const stakeEvents = await staking.queryFilter(stakeFilter, 0, 'latest')

  // 查询 RWA 质押事件 RWAStakeEvent(user, ..., stakeId, timestamp, lockPeriod)
  const rwaFilter = staking.filters.RWAStakeEvent(TARGET_ADDRESS)
  const rwaEvents = await staking.queryFilter(rwaFilter, 0, 'latest')

  interface Row {
    time: number
    type: 'USDT' | 'RWA'
    amount: bigint
    stakeId: string
    lockPeriod: number
    txHash: string
  }

  const rows: Row[] = []

  for (const e of stakeEvents) {
    const args = e.args as any
    if (!args || String(args.user).toLowerCase() !== normalized) continue
    rows.push({
      time: Number(args.timestamp ?? 0),
      type: 'USDT',
      amount: args.amount ?? 0n,
      stakeId: String(args.stakeId ?? '0'),
      lockPeriod: Number(args.lockPeriod ?? 0),
      txHash: e.transactionHash || '',
    })
  }

  for (const e of rwaEvents) {
    const args = e.args as any
    if (!args || String(args.user).toLowerCase() !== normalized) continue
    rows.push({
      time: Number(args.timestamp ?? 0),
      type: 'RWA',
      amount: args.amount ?? 0n,
      stakeId: String(args.stakeId ?? '0'),
      lockPeriod: Number(args.lockPeriod ?? 0),
      txHash: e.transactionHash || '',
    })
  }

  rows.sort((a, b) => a.time - b.time)

  const lockLabel = (lp: number) => {
    if (lp === 30) return '30天'
    if (lp === 90) return '90天'
    if (lp === 180) return '180天'
    if (lp === 365) return '365天'
    return '灵活'
  }

  console.log(`📊 当前质押记录共 ${rows.length} 笔:\n`)

  let totalUSDT = 0n
  let totalRWA = 0n
  rows.forEach((r, i) => {
    if (r.type === 'USDT') totalUSDT += r.amount
    else totalRWA += r.amount
    console.log(`  #${i + 1} ${r.type}  金额: ${ethers.formatUnits(r.amount, 18)} ${r.type}  锁仓: ${lockLabel(r.lockPeriod)}  时间: ${new Date(r.time * 1000).toLocaleString('zh-CN')}`)
    if (r.txHash) console.log(`       tx: ${r.txHash}`)
    console.log('')
  })

  console.log('---')
  console.log(`  USDT 质押笔数: ${stakeEvents.length}  合计: ${ethers.formatUnits(totalUSDT, 18)} USDT`)
  console.log(`  RWA  质押笔数: ${rwaEvents.length}  合计: ${ethers.formatUnits(totalRWA, 18)} RWA`)
  console.log('')

  // 链上用户汇总信息（若合约支持）
  try {
    const info = await staking.getUserStakeInfo(TARGET_ADDRESS)
    console.log('📋 链上用户汇总 (getUserStakeInfo):')
    console.log('   totalStaked (USDT):', ethers.formatUnits(info[0] ?? 0n, 18))
    console.log('   rwaPending:         ', ethers.formatUnits(info[1] ?? 0n, 18))
    console.log('   usdtRewards:        ', ethers.formatUnits(info[2] ?? 0n, 18))
  } catch (e) {
    console.log('(getUserStakeInfo 不可用或未部署)')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
