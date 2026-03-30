import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { bsc } from 'wagmi/chains'

// Standard ERC20 ABI (for balanceOf and approve)
const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useRWA() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // 与 chainId: bsc.id 的只读一致：始终用 BSC 主网配置的 RWA / Staking 地址（避免钱包在其它链时取不到地址）
  const bscAddrs = CONTRACT_ADDRESSES[bsc.id]
  const rwaTokenAddress = bscAddrs.rwaToken
  const stakingAddress = bscAddrs.stakingContract

  // 余额/授权始终读 BSC 主网合约；否则钱包在 ETH 等链时会在错误链上读合约，余额恒为 0
  const legacyRwa =
    bscAddrs.legacyRwaToken && bscAddrs.legacyRwaToken.toLowerCase() !== rwaTokenAddress.toLowerCase()
      ? bscAddrs.legacyRwaToken
      : ''

  const {
    data: balance,
    refetch: refetchBalance,
    isFetching: balanceFetching,
    isPending: balancePending,
    isError: balanceIsError,
    error: balanceReadError,
  } = useReadContract({
    chainId: bsc.id,
    address: rwaTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!rwaTokenAddress,
      staleTime: 15_000,
      retry: 2,
    },
  })

  const {
    data: legacyBalance,
    refetch: refetchLegacyBalance,
    isPending: legacyPending,
    isError: legacyIsError,
  } = useReadContract({
    chainId: bsc.id,
    address: (legacyRwa || rwaTokenAddress) as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address && legacyRwa ? [address] : undefined,
    query: {
      enabled: !!address && !!legacyRwa,
      staleTime: 30_000,
      retry: 1,
    },
  })

  const { data: allowance, refetch: refetchAllowanceOnly } = useReadContract({
    chainId: bsc.id,
    address: rwaTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && stakingAddress ? [address, stakingAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!rwaTokenAddress && !!stakingAddress,
    },
  })

  // Approve RWA for StakingContract
  async function approveStaking(amount: string) {
    if (!rwaTokenAddress || !stakingAddress) {
      throw new Error('RWA token or staking contract not found')
    }
    const amt = amount != null ? String(amount).trim() : ''
    if (!amt || isNaN(parseFloat(amt))) {
      throw new Error('请输入有效的质押金额')
    }

    const amountInWei = parseUnits(amt, 18) // RWA is 18 decimals

    try {
      const hash = await writeContractAsync({
        address: rwaTokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [stakingAddress as Address, amountInWei],
      })

      return hash
    } catch (error: any) {
      // 提供更友好的错误信息
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      
      // 检查是否是暂停错误
      if (errorMessage.includes('paused') || errorMessage.includes('Pausable') || errorMessage.includes('whenNotPaused')) {
        throw new Error('RWA Token contract is paused. Please contact the administrator to unpause the contract.')
      }
      
      // 检查是否是余额不足
      if (errorMessage.includes('insufficient') || errorMessage.includes('balance') || errorMessage.includes('ERC20InsufficientBalance')) {
        throw new Error('Insufficient RWA balance. Please ensure you have enough RWA tokens.')
      }
      
      // 检查是否是授权被拒绝
      if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('User rejected')) {
        throw new Error('Transaction was rejected. Please try again.')
      }
      
      // 其他错误
      throw new Error(`Failed to approve RWA: ${errorMessage}`)
    }
  }

  // Approve max amount
  async function approveMax() {
    if (!rwaTokenAddress || !stakingAddress) {
      throw new Error('RWA token or staking contract not found')
    }

    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

    const hash = await writeContractAsync({
      address: rwaTokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [stakingAddress as Address, maxAmount],
    })

    return hash
  }

  // 勿在 data 仍为 undefined 时显示 0：会被误认为「链上余额为零」（真实 0 应为 balance === 0n）
  const formattedBalance =
    !address
      ? '0'
      : balanceIsError
        ? '—'
        : balance === undefined
          ? '…'
          : formatUnits(balance, 18)

  const formattedLegacyBalance =
    !legacyRwa || !address
      ? ''
      : legacyIsError
        ? '—'
        : legacyBalance === undefined
          ? '…'
          : formatUnits(legacyBalance, 18)

  const isBalanceLoading = !!address && !balanceIsError && balance === undefined
  const rwaBalanceWei = !address || balanceIsError || balance === undefined ? undefined : balance
  const formattedAllowance =
    allowance === undefined ? '0' : formatUnits(allowance, 18)
  const isApproved = allowance !== undefined && allowance > BigInt(0)

  if (balanceIsError && balanceReadError) {
    console.warn('[useRWA] balanceOf failed', rwaTokenAddress, balanceReadError)
  }

  return {
    balance: formattedBalance,
    allowance: formattedAllowance,
    isApproved: !!isApproved,
    rwaTokenAddress,
    legacyRwaTokenAddress: legacyRwa || undefined,
    legacyBalance: formattedLegacyBalance,
    balanceFetching: !!address && (balanceFetching || balancePending),
    legacyBalanceLoading: !!address && !!legacyRwa && (legacyPending || legacyBalance === undefined) && !legacyIsError,
    isBalanceLoading,
    /** 链上当前 RWA（新合约）wei，未就绪时为 undefined */
    rwaBalanceWei,
    balanceReadError: balanceIsError ? balanceReadError : undefined,
    approveStaking,
    approveMax,
    refetchBalance,
    refetchAllowance: refetchAllowanceOnly,
    /** 余额 + 授权 +（如有）旧版 RWA 余额 */
    async refetchRwaReads() {
      await Promise.all([
        refetchBalance(),
        refetchAllowanceOnly(),
        ...(legacyRwa ? [refetchLegacyBalance()] : []),
      ])
    },
  }
}
