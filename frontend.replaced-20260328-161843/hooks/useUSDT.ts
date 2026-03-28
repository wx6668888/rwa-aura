import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { bsc } from 'wagmi/chains'

export function useUSDT() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const bscAddrs = CONTRACT_ADDRESSES[bsc.id]
  const usdtAddress = bscAddrs.usdtToken
  const stakingAddress = bscAddrs.stakingContract

  // 始终读 BSC 主网；避免钱包未切到 BSC 时在错误链上查 balanceOf 显示 0
  const {
    data: balance,
    refetch: refetchBalance,
    error: balanceError,
    isFetching: balanceFetching,
    isPending: balancePending,
    isError: balanceIsError,
  } = useReadContract({
    chainId: bsc.id,
    address: usdtAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdtAddress,
      staleTime: 15_000,
      retry: 2,
    },
  })

  if (balanceIsError && balanceError) {
    console.warn('[useUSDT] balanceOf failed', usdtAddress, balanceError)
  }

  // Read USDT allowance for staking contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    chainId: bsc.id,
    address: usdtAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'allowance',
    args: address && stakingAddress ? [address, stakingAddress] : undefined,
    query: {
      enabled: !!address && !!usdtAddress && !!stakingAddress,
    },
  })

  // Approve USDT for staking contract (or custom spender)
  async function approve(amount: string, spender?: string) {
    if (!usdtAddress) throw new Error('USDT address not found')
    const targetSpender = spender || stakingAddress;
    if (!targetSpender) throw new Error('Spender address not found')
    const amt = amount != null ? String(amount).trim() : ''
    if (!amt || isNaN(parseFloat(amt))) {
      throw new Error('请输入有效的质押金额')
    }
    // Convert amount to 6 decimals (USDT precision)
    const amountInWei = parseUnits(amt, 6)
    
    const hash = await writeContractAsync({
      address: usdtAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: 'approve',
      args: [targetSpender as `0x${string}`, amountInWei],
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

  const formattedBalance =
    !address
      ? '0'
      : balanceIsError
        ? '—'
        : balance === undefined
          ? '…'
          : formatUnits(balance, 6)
  const formattedAllowance =
    allowance === undefined ? '0' : formatUnits(allowance, 6)

  return {
    usdtAddress,
    balance: formattedBalance,
    allowance: formattedAllowance,
    balanceFetching: !!address && (balanceFetching || balancePending),
    balanceReadError: balanceIsError ? balanceError : undefined,
    approve,
    approveMax,
    isApproved,
    refetchBalance,
    refetchAllowance,
  }
}
