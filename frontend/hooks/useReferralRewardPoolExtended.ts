import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const REFERRAL_POOL_ABI = [
  {
    name: 'getPendingRewards',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'pending', type: 'uint256' },
      { name: 'withdrawable', type: 'uint256' }
    ]
  },
  {
    name: 'lastSettlementTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'MIN_WITHDRAWAL',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'WITHDRAWAL_FEE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export function useReferralRewardPoolExtended() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const poolAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.referralRewardPool

  // 查询余额
  const { data: rewards, refetch } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: REFERRAL_POOL_ABI,
    functionName: 'getPendingRewards',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!poolAddress }
  })

  // 上次结算时间
  const { data: lastSettlement } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: REFERRAL_POOL_ABI,
    functionName: 'lastSettlementTime',
    query: { enabled: !!poolAddress }
  })

  // 最低提现额
  const { data: minWithdrawal } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: REFERRAL_POOL_ABI,
    functionName: 'MIN_WITHDRAWAL',
    query: { enabled: !!poolAddress }
  })

  // 提现手续费
  const { data: withdrawalFee } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: REFERRAL_POOL_ABI,
    functionName: 'WITHDRAWAL_FEE',
    query: { enabled: !!poolAddress }
  })

  // 提现
  async function withdraw(amount: string) {
    if (!poolAddress) throw new Error('合约未找到')
    
    const amountWei = parseUnits(amount, 6) // USDT 6位
    const minWei = minWithdrawal || 0n
    
    if (amountWei < minWei) {
      throw new Error(`最低提现 ${formatUnits(minWei, 6)} USDT`)
    }
    
    return await writeContractAsync({
      address: poolAddress as `0x${string}`,
      abi: REFERRAL_POOL_ABI,
      functionName: 'withdraw',
      args: [amountWei]
    })
  }

  return {
    pending: rewards ? formatUnits(rewards[0], 6) : '0',
    withdrawable: rewards ? formatUnits(rewards[1], 6) : '0',
    lastSettlement: lastSettlement ? new Date(Number(lastSettlement) * 1000) : null,
    minWithdrawal: minWithdrawal ? formatUnits(minWithdrawal, 6) : '100',
    fee: withdrawalFee ? Number(withdrawalFee) : 8,
    withdraw,
    refetch
  }
}
