import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const STRWA_EXTENDED_ABI = [
  {
    name: 'getLocks',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
      { name: 'unlockTimes', type: 'uint256[]' },
      { name: 'released', type: 'bool[]' }
    ]
  },
  {
    name: 'availableBalanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'releaseExpiredLocks',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'releasedAmount', type: 'uint256' }]
  },
  {
    name: 'isReady',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

export interface StRWALock {
  amount: string
  unlockTime: Date
  released: boolean
}

export function useStRWAExtended() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const stRWAAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stRWA

  // 查询合约是否就绪
  const { data: isReady } = useReadContract({
    address: stRWAAddress as `0x${string}`,
    abi: STRWA_EXTENDED_ABI,
    functionName: 'isReady',
    query: { enabled: !!stRWAAddress }
  })

  // 查询可用余额
  const { data: availableBalance, refetch: refetchAvailable } = useReadContract({
    address: stRWAAddress as `0x${string}`,
    abi: STRWA_EXTENDED_ABI,
    functionName: 'availableBalanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!stRWAAddress }
  })

  // 查询锁仓列表
  const { data: locks, refetch: refetchLocks } = useReadContract({
    address: stRWAAddress as `0x${string}`,
    abi: STRWA_EXTENDED_ABI,
    functionName: 'getLocks',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!stRWAAddress }
  })

  // 释放到期锁仓
  async function releaseExpiredLocks() {
    if (!stRWAAddress || !address) throw new Error('Contract not ready')
    
    const hash = await writeContractAsync({
      address: stRWAAddress as `0x${string}`,
      abi: STRWA_EXTENDED_ABI,
      functionName: 'releaseExpiredLocks',
      args: [address]
    })

    return hash
  }

  // 格式化锁仓列表
  const formattedLocks: StRWALock[] = locks ? locks[0].map((amount, i) => ({
    amount: formatUnits(amount, 18),
    unlockTime: new Date(Number(locks[1][i]) * 1000),
    released: locks[2][i]
  })) : []

  const hasExpiredLocks = formattedLocks.some(lock => !lock.released && lock.unlockTime <= new Date())

  return {
    isReady: !!isReady,
    availableBalance: availableBalance ? formatUnits(availableBalance, 18) : '0',
    locks: formattedLocks,
    hasExpiredLocks,
    releaseExpiredLocks,
    refetchAvailable,
    refetchLocks
  }
}
