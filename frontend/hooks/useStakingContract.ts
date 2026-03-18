import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

export function useStakingContract() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const stakingAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract : undefined

  // Read user stake info
  const { data: userStakeInfo, refetch: refetchStakeInfo, isLoading: isLoadingStakeInfo } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getUserStakeInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })

  // Read user rewards
  const { data: userRewards, refetch: refetchRewards } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getUserRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })

  // Read total staked
  const { data: totalStaked } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getTotalStaked',
    query: {
      enabled: !!stakingAddress,
    },
  })

  // Stake function (USDT staking)
  async function stake(amount: string, referrer?: string, lockPeriod: number = 0) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    const amt = amount != null ? String(amount).trim() : ''
    if (!amt || isNaN(parseFloat(amt))) throw new Error('请输入有效的质押金额')
    const lock = Number(lockPeriod)
    const lockSafe = Number.isFinite(lock) ? lock : 0
    
    // Convert amount to 6 decimals (USDT precision)
    const amountInWei = parseUnits(amt, 6)
    
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'stake',
      args: [
        amountInWei, 
        (referrer || '0x0000000000000000000000000000000000000000') as `0x${string}`,
        BigInt(lockSafe)
      ],
      gas: 5000000n, // Set gas limit to 5M (within Hardhat's 16M cap)
    })

    return hash
  }

  // Stake RWA function
  async function stakeRWA(amount: string, referrer?: string, lockPeriod: number = 0) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    const amt = amount != null ? String(amount).trim() : ''
    if (!amt || isNaN(parseFloat(amt))) throw new Error('请输入有效的质押金额')
    const lock = Number(lockPeriod)
    const lockSafe = Number.isFinite(lock) ? lock : 0
    
    // Convert amount to 18 decimals (RWA precision)
    const amountInWei = parseUnits(amt, 18)
    
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'stakeRWA',
      args: [
        amountInWei, 
        (referrer || '0x0000000000000000000000000000000000000000') as `0x${string}`,
        BigInt(lockSafe)
      ],
      gas: 5000000n,
    })

    return hash
  }

  async function withdrawRWALockedPrincipal(lockIndex: number, chooseStRWA: boolean = false) {
    if (!stakingAddress) throw new Error('Staking contract not found')

    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdrawRWALockedPrincipal',
      args: [BigInt(lockIndex), chooseStRWA],
    })

    return hash
  }

  // Withdraw RWA rewards
  async function withdrawRWARewards(amount: string, chooseStRWA: boolean = false) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    
    const amountInWei = parseUnits(amount, 18)
    
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdrawRWARewards',
      args: [amountInWei, chooseStRWA],
    })

    return hash
  }

  // Withdraw function (USDT staking RWA rewards)
  async function withdraw(amount: string, chooseStRWA: boolean = false) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    
    const amountInWei = parseUnits(amount, 18)
    
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdraw',
      args: [amountInWei, chooseStRWA],
    })

    return hash
  }

  async function withdrawFlexibleUSDTPrincipal(amount: string) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    const amountWei = parseUnits(amount, 18)
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdrawFlexibleUSDTPrincipal',
      args: [amountWei],
    })
    return hash
  }

  async function withdrawUSDTPrincipal(lockIndex: number) {
    if (!stakingAddress) throw new Error('Staking contract not found')

    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdrawUSDTPrincipal',
      args: [BigInt(lockIndex)],
    })

    return hash
  }

  async function emergencyWithdraw(lockIndex: number) {
    if (!stakingAddress) throw new Error('Staking contract not found')

    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'emergencyWithdraw',
      args: [BigInt(lockIndex)],
    })

    return hash
  }

  // Format user data
  const formattedUserData = userStakeInfo ? {
    totalStaked: formatUnits(userStakeInfo[0], 18),
    rwaPending: formatUnits(userStakeInfo[1], 18),
    usdtRewards: formatUnits(userStakeInfo[2], 18),
    lastWithdrawTime: Number(userStakeInfo[3]),
    referrer: userStakeInfo[4],
    nodeLevel: userStakeInfo[5],
    firstStakeTime: userStakeInfo[6] ? Number(userStakeInfo[6]) : 0, // Get firstStakeTime from getUserStakeInfo
  } : null

  const formattedRewards = userRewards ? {
    rwaPending: formatUnits(userRewards[0], 18),
    usdtRewards: formatUnits(userRewards[1], 18),
  } : null

  // Read RWA stake info
  const { data: rwaStakeInfo, refetch: refetchRWAStakeInfo, isLoading: isLoadingRWAStakeInfo } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'rwaStakes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })

  // Read RWA locked principals
  const { data: rwaLockedPrincipals, refetch: refetchRWALockedPrincipals } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getRWALockedPrincipals',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })

  const { data: usdtLockedPrincipals, refetch: refetchUSDTLockedPrincipals } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getUSDTLockedPrincipals',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })

  // 灵活可提现金额：按全额（TotalStaked）显示与提现，合约 50/50 不足时由管理员从国库转入
  const { data: rwaFlexibleTotalStakedRaw, refetch: refetchRwaFlexiblePrincipal } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'rwaFlexibleTotalStaked',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })
  const rwaFlexiblePrincipal = rwaFlexibleTotalStakedRaw != null ? formatUnits(rwaFlexibleTotalStakedRaw, 18) : '0'

  const { data: usdtFlexibleTotalStakedRaw, refetch: refetchUsdtFlexiblePrincipal } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'usdtFlexibleTotalStaked',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stakingAddress,
    },
  })
  const usdtFlexiblePrincipal = usdtFlexibleTotalStakedRaw != null ? formatUnits(usdtFlexibleTotalStakedRaw, 18) : '0'

  async function withdrawFlexibleRWAPrincipal(amount: string) {
    if (!stakingAddress) throw new Error('Staking contract not found')
    const amountWei = parseUnits(amount, 18)
    const hash = await writeContractAsync({
      address: stakingAddress as `0x${string}`,
      abi: stakingContractABI,
      functionName: 'withdrawFlexibleRWAPrincipal',
      args: [amountWei],
    })
    return hash
  }

  const formattedRWAStakeInfo = rwaStakeInfo ? {
    totalStakedRWA: formatUnits(rwaStakeInfo[0], 18),
    rwaPending: formatUnits(rwaStakeInfo[1], 18),
    lastWithdrawTime: Number(rwaStakeInfo[2]),
    referrer: rwaStakeInfo[3],
    firstStakeTime: Number(rwaStakeInfo[4]),
    nodeLevel: rwaStakeInfo[5],
    isActive: rwaStakeInfo[6],
  } : null

  const formattedRWALockedPrincipals = rwaLockedPrincipals ? {
    stakeIds: rwaLockedPrincipals[0].map((id: bigint) => id.toString()),
    amounts: rwaLockedPrincipals[1].map((amt: bigint) => formatUnits(amt, 18)),
    lockStartTimes: rwaLockedPrincipals[2].map((ts: bigint) => Number(ts)),
    lockEndTimes: rwaLockedPrincipals[3].map((ts: bigint) => Number(ts)),
    canWithdraw: rwaLockedPrincipals[4],
    isWithdrawn: rwaLockedPrincipals[5],
  } : null

  const formattedUSDTLockedPrincipals = usdtLockedPrincipals ? {
    stakeIds: usdtLockedPrincipals[0].map((id: bigint) => id.toString()),
    amounts: usdtLockedPrincipals[1].map((amt: bigint) => formatUnits(amt, 18)),
    lockStartTimes: usdtLockedPrincipals[2].map((ts: bigint) => Number(ts)),
    lockEndTimes: usdtLockedPrincipals[3].map((ts: bigint) => Number(ts)),
    canWithdraw: usdtLockedPrincipals[4],
    isWithdrawn: usdtLockedPrincipals[5],
  } : null

  return {
    // Contract address
    stakingAddress,
    
    // User data (USDT staking)
    userStakeInfo: formattedUserData,
    userRewards: formattedRewards,
    totalStaked: totalStaked ? formatUnits(totalStaked, 18) : '0',
    
    // RWA staking data
    rwaStakeInfo: formattedRWAStakeInfo,
    rwaLockedPrincipals: formattedRWALockedPrincipals,
    usdtLockedPrincipals: formattedUSDTLockedPrincipals,
    rwaFlexiblePrincipal,
    usdtFlexiblePrincipal,
    refetchRwaFlexiblePrincipal,
    refetchUsdtFlexiblePrincipal,
    refetchUSDTLockedPrincipals,
    refetchRWALockedPrincipals,
    
    // Functions
    stake,
    stakeRWA,
    withdraw,
    withdrawRWALockedPrincipal,
    withdrawRWARewards,
    withdrawFlexibleRWAPrincipal,
    withdrawFlexibleUSDTPrincipal,
    withdrawUSDTPrincipal,
    emergencyWithdraw,
    
    // Refetch functions
    refetchStakeInfo,
    refetchRewards,
    refetchRWAStakeInfo,
    refetchUSDTLockedPrincipals,
    refetchRWALockedPrincipals,
    
    // Loading state
    isLoading: isLoadingStakeInfo,
    isLoadingRWAStakeInfo,
  }
}
