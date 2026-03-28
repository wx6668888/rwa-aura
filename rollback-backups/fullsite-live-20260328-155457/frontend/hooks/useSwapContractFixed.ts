import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const SWAP_ABI = [
  {
    name: 'getPoolStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'rwaBalance', type: 'uint256' },
      { name: 'stRwaBalance', type: 'uint256' },
      { name: 'constantProduct_', type: 'uint256' },
      { name: 'swapRate', type: 'uint256' }
    ]
  },
  {
    name: 'getSwapRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'isStRWAToRWA', type: 'bool' }
    ],
    outputs: [
      { name: 'outputAmount', type: 'uint256' },
      { name: 'swapRate', type: 'uint256' }
    ]
  },
  {
    name: 'getUserDailySwapAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'amount', type: 'uint256' }]
  },
  {
    name: 'getGlobalDailySwapAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'amount', type: 'uint256' }]
  },
  {
    name: 'swapEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'maxDailySwapPerUser',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'swapStRWAToRWA',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'stRwaAmount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'swapRWAToStRWA',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rwaAmount', type: 'uint256' }],
    outputs: []
  }
] as const

export function useSwapContractFixed() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const swapAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.swapContract

  // 池子状态
  const { data: poolStatus, refetch: refetchPool } = useReadContract({
    address: swapAddress as `0x${string}`,
    abi: SWAP_ABI,
    functionName: 'getPoolStatus',
    query: { enabled: !!swapAddress }
  })

  // 互换开关
  const { data: swapEnabled } = useReadContract({
    address: swapAddress as `0x${string}`,
    abi: SWAP_ABI,
    functionName: 'swapEnabled',
    query: { enabled: !!swapAddress }
  })

  // 用户今日额度
  const { data: userDailyUsed } = useReadContract({
    address: swapAddress as `0x${string}`,
    abi: SWAP_ABI,
    functionName: 'getUserDailySwapAmount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!swapAddress }
  })

  // 用户每日限额
  const { data: userDailyLimit } = useReadContract({
    address: swapAddress as `0x${string}`,
    abi: SWAP_ABI,
    functionName: 'maxDailySwapPerUser',
    query: { enabled: !!swapAddress }
  })

  // 全局今日额度
  const { data: globalDailyUsed } = useReadContract({
    address: swapAddress as `0x${string}`,
    abi: SWAP_ABI,
    functionName: 'getGlobalDailySwapAmount',
    query: { enabled: !!swapAddress }
  })

  // 获取报价
  async function getQuote(amount: string, isStRWAToRWA: boolean) {
    if (!swapAddress || !amount) return null
    
    try {
      const amountWei = parseUnits(amount, 18)
      const result = await useReadContract({
        address: swapAddress as `0x${string}`,
        abi: SWAP_ABI,
        functionName: 'getSwapRate',
        args: [amountWei, isStRWAToRWA]
      }).data as [bigint, bigint] | undefined

      if (!result) return null
      return {
        outputAmount: formatUnits(result[0], 18),
        rate: Number(result[1])
      }
    } catch {
      return null
    }
  }

  // 检查限额
  function checkLimit(amount: string): { ok: boolean; reason?: string } {
    if (!swapEnabled) return { ok: false, reason: '互换已暂停' }
    
    const amountWei = parseUnits(amount, 18)
    const userUsed = userDailyUsed || 0n
    const userLimit = userDailyLimit || 0n
    
    if (userUsed + amountWei > userLimit) {
      return { ok: false, reason: '超出个人每日限额' }
    }
    
    return { ok: true }
  }

  // 互换
  async function swap(amount: string, isStRWAToRWA: boolean) {
    if (!swapAddress) throw new Error('合约未找到')
    
    const check = checkLimit(amount)
    if (!check.ok) throw new Error(check.reason)
    
    const amountWei = parseUnits(amount, 18)
    const fn = isStRWAToRWA ? 'swapStRWAToRWA' : 'swapRWAToStRWA'
    
    return await writeContractAsync({
      address: swapAddress as `0x${string}`,
      abi: SWAP_ABI,
      functionName: fn,
      args: [amountWei]
    })
  }

  return {
    poolStatus: poolStatus ? {
      rwaBalance: formatUnits(poolStatus[0], 18),
      stRwaBalance: formatUnits(poolStatus[1], 18),
      rate: Number(poolStatus[3])
    } : null,
    swapEnabled: !!swapEnabled,
    userDailyRemaining: userDailyLimit && userDailyUsed 
      ? formatUnits(userDailyLimit - userDailyUsed, 18) 
      : '0',
    getQuote,
    checkLimit,
    swap,
    refetchPool
  }
}
