import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

export function useUSDT() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const usdtAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.usdtToken : undefined
  const stakingAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract : undefined

  // Debug logging for local development
  if (process.env.NODE_ENV === 'development' && chainId === 31337) {
    console.log('[useUSDT] Debug Info:', {
      chainId,
      address,
      usdtAddress,
      stakingAddress,
    })
  }

  // Read USDT balance
  const { data: balance, refetch: refetchBalance, error: balanceError } = useReadContract({
    address: usdtAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdtAddress,
    },
  })

  // Log errors for debugging
  if (balanceError && process.env.NODE_ENV === 'development') {
    console.error('[useUSDT] Balance query error:', balanceError)
  }

  // Read USDT allowance for staking contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'allowance',
    args: address && stakingAddress ? [address, stakingAddress] : undefined,
    query: {
      enabled: !!address && !!usdtAddress && !!stakingAddress,
    },
  })

  // Approve USDT for staking contract
  async function approve(amount: string) {
    if (!usdtAddress || !stakingAddress) throw new Error('Contract addresses not found')
    
    // Convert amount to 6 decimals (USDT precision)
    const amountInWei = parseUnits(amount, 6)
    
    const hash = await writeContractAsync({
      address: usdtAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: 'approve',
      args: [stakingAddress as `0x${string}`, amountInWei],
    })

    return hash
  }

  // Approve max amount
  async function approveMax() {
    if (!usdtAddress || !stakingAddress) throw new Error('Contract addresses not found')
    
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    
    const hash = await writeContractAsync({
      address: usdtAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: 'approve',
      args: [stakingAddress as `0x${string}`, maxAmount],
    })

    return hash
  }

  // Check if amount is approved
  function isApproved(amount: string): boolean {
    if (!allowance) return false
    const amountInWei = parseUnits(amount, 6)
    return allowance >= amountInWei
  }

  return {
    // Token address
    usdtAddress,
    
    // Balance and allowance
    balance: balance ? formatUnits(balance, 6) : '0',
    allowance: allowance ? formatUnits(allowance, 6) : '0',
    
    // Functions
    approve,
    approveMax,
    isApproved,
    
    // Refetch functions
    refetchBalance,
    refetchAllowance,
  }
}
