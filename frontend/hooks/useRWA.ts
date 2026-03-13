import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits, Address, zeroAddress } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

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
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // 如果 chainId 是 undefined，使用 31337 作为默认值
  const effectiveChainId = chainId || 31337

  const rwaTokenAddress = CONTRACT_ADDRESSES[effectiveChainId as keyof typeof CONTRACT_ADDRESSES]?.rwaToken
  const stakingAddress = CONTRACT_ADDRESSES[effectiveChainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract

  // Read RWA balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: rwaTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!rwaTokenAddress,
    },
  })

  // Read RWA allowance for StakingContract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: rwaTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && stakingAddress ? [address, stakingAddress] : undefined,
    query: {
      enabled: !!address && !!rwaTokenAddress && !!stakingAddress,
    },
  })

  // Approve RWA for StakingContract
  async function approveStaking(amount: string) {
    if (!rwaTokenAddress || !stakingAddress) {
      throw new Error('RWA token or staking contract not found')
    }

    const amountInWei = parseUnits(amount, 18) // RWA is 18 decimals

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

  const formattedBalance = balance ? formatUnits(balance, 18) : '0'
  const formattedAllowance = allowance ? formatUnits(allowance, 18) : '0'
  const isApproved = allowance && allowance > 0n

  // 只在余额变化时打印一次
  if (balance !== undefined) {
    console.log('RWA Balance:', formattedBalance, 'Address:', address, 'Token:', rwaTokenAddress)
  }

  return {
    balance: formattedBalance,
    allowance: formattedAllowance,
    isApproved: !!isApproved,
    approveStaking,
    approveMax,
    refetchBalance,
    refetchAllowance,
  }
}
