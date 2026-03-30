import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const TEAM_DIVIDEND_ABI = [
  {
    name: 'dividendBalances',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'dailyWithdrawalCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getPoolStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalBalance', type: 'uint256' },
      { name: '_settledUnwithdrawn', type: 'uint256' },
      { name: '_reservedGas', type: 'uint256' },
      { name: 'availableBalance', type: 'uint256' }
    ]
  },
  {
    name: 'MAX_WITHDRAWAL_PER_TX',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'MAX_WITHDRAWALS_PER_DAY',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'withdrawDividend',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  }
] as const

export function useTeamDividendExtended() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const poolAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.teamDividendPool

  // 查询余额
  const { data: balance, refetch } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: TEAM_DIVIDEND_ABI,
    functionName: 'dividendBalances',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!poolAddress }
  })

  // 今日提现次数
  const { data: dailyCount } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: TEAM_DIVIDEND_ABI,
    functionName: 'dailyWithdrawalCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!poolAddress }
  })

  // 池子状态
  const { data: poolStatus } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: TEAM_DIVIDEND_ABI,
    functionName: 'getPoolStatus',
    query: { enabled: !!poolAddress }
  })

  // 单笔限额
  const { data: maxPerTx } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: TEAM_DIVIDEND_ABI,
    functionName: 'MAX_WITHDRAWAL_PER_TX',
    query: { enabled: !!poolAddress }
  })

  // 每日次数限额
  const { data: maxPerDay } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: TEAM_DIVIDEND_ABI,
    functionName: 'MAX_WITHDRAWALS_PER_DAY',
    query: { enabled: !!poolAddress }
  })

  // 提现
  async function withdraw(amount: string) {
    if (!poolAddress) throw new Error('合约未找到')
    
    const amountWei = parseUnits(amount, 6)
    const maxWei = maxPerTx || BigInt(0)
    
    if (amountWei > maxWei) {
      throw new Error(`单笔最高 ${formatUnits(maxWei, 6)} USDT`)
    }
    
    const count = dailyCount || BigInt(0)
    const limit = maxPerDay || BigInt(0)
    if (count >= limit) {
      throw new Error('今日提现次数已达上限')
    }
    
    return await writeContractAsync({
      address: poolAddress as `0x${string}`,
      abi: TEAM_DIVIDEND_ABI,
      functionName: 'withdrawDividend',
      args: [amountWei]
    })
  }

  return {
    balance: balance ? formatUnits(balance, 6) : '0',
    dailyCount: Number(dailyCount ?? BigInt(0)),
    maxPerDay: Number(maxPerDay ?? BigInt(0)),
    maxPerTx: maxPerTx ? formatUnits(maxPerTx, 6) : '100000',
    poolStatus: poolStatus ? {
      total: formatUnits(poolStatus[0], 6),
      settled: formatUnits(poolStatus[1], 6),
      reserved: formatUnits(poolStatus[2], 6),
      available: formatUnits(poolStatus[3], 6)
    } : null,
    withdraw,
    refetch
  }
}
