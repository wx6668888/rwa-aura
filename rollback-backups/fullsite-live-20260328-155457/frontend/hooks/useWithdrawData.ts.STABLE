'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useUserStakes } from './useUserStakes'
import { useStakingContract } from './useStakingContract'
import { formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

export function useWithdrawData() {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { stakes, loading: stakesLoading } = useUserStakes()
  const { userRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  
  const [data, setData] = useState({
    yieldAmount: '0',
    rwaPrincipal: '0',
    usdtPrincipal: '0',
    referralAmount: '0',
    dividendAmount: '0',
    dailyWithdrawCount: 0,
    strwaAmount: '0',
    totalUSD: '0',
    loading: true,
    lockedStakes: [] as Array<{
      stakeId: string
      amount: number
      lockPeriod: string
      lockEndTime: number
      isRWAStake: boolean
      timestamp: number
    }>
  })

  const fetchData = useCallback(async () => {
    if (!isConnected || !address || stakesLoading || !publicClient || !chainId) {
      setData(prev => ({ ...prev, loading: stakesLoading }))
      return
    }

    try {
      const RWA_PRICE = 0.85
      
      const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
      const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
      const yieldAmount = (usdtRwaPending + rwaRwaPending).toFixed(2)
      
      const usdtPrincipal = parseFloat(usdtFlexiblePrincipal || '0')
      const rwaPrincipal = parseFloat(rwaFlexiblePrincipal || '0')
      
      const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
      let lockedStakes: any[] = []
      
      if (addresses?.stakingContract) {
        try {
          const [rwaStakeIds, rwaAmounts, rwaLockStartTimes, rwaLockEndTimes] = await publicClient.readContract({
            address: addresses.stakingContract as `0x${string}`,
            abi: [{
              name: 'getRWALockedPrincipals',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'user', type: 'address' }],
              outputs: [
                { name: 'stakeIds', type: 'uint256[]' },
                { name: 'amounts', type: 'uint256[]' },
                { name: 'lockStartTimes', type: 'uint256[]' },
                { name: 'lockEndTimes', type: 'uint256[]' },
                { name: 'canWithdraw', type: 'bool[]' },
                { name: 'isWithdrawn', type: 'bool[]' }
              ]
            }],
            functionName: 'getRWALockedPrincipals',
            args: [address],
          }) as [bigint[], bigint[], bigint[], bigint[], boolean[], boolean[]]
          
          const [usdtStakeIds, usdtAmounts, usdtLockStartTimes, usdtLockEndTimes] = await publicClient.readContract({
            address: addresses.stakingContract as `0x${string}`,
            abi: [{
              name: 'getUSDTLockedPrincipals',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'user', type: 'address' }],
              outputs: [
                { name: 'stakeIds', type: 'uint256[]' },
                { name: 'amounts', type: 'uint256[]' },
                { name: 'lockStartTimes', type: 'uint256[]' },
                { name: 'lockEndTimes', type: 'uint256[]' },
                { name: 'canWithdraw', type: 'bool[]' },
                { name: 'isWithdrawn', type: 'bool[]' }
              ]
            }],
            functionName: 'getUSDTLockedPrincipals',
            args: [address],
          }) as [bigint[], bigint[], bigint[], bigint[], boolean[], boolean[]]
          
          rwaStakeIds.forEach((id, i) => {
            const lockPeriod = Math.floor((Number(rwaLockEndTimes[i]) - Number(rwaLockStartTimes[i])) / 86400)
            lockedStakes.push({
              stakeId: `rwa_${id}`,
              amount: Number(rwaAmounts[i]) / 1e18,
              lockPeriod: lockPeriod.toString(),
              lockEndTime: Number(rwaLockEndTimes[i]),
              isRWAStake: true,
              timestamp: Number(rwaLockStartTimes[i])
            })
          })
          
          usdtStakeIds.forEach((id, i) => {
            const lockPeriod = Math.floor((Number(usdtLockEndTimes[i]) - Number(usdtLockStartTimes[i])) / 86400)
            lockedStakes.push({
              stakeId: `usdt_${id}`,
              amount: Number(usdtAmounts[i]) / 1e18,
              lockPeriod: lockPeriod.toString(),
              lockEndTime: Number(usdtLockEndTimes[i]),
              isRWAStake: false,
              timestamp: Number(usdtLockStartTimes[i])
            })
          })
        } catch (err) {
          console.warn('[useWithdrawData] Failed to read locked stakes:', err)
        }
      }
      
      const yieldUSD = parseFloat(yieldAmount) * RWA_PRICE
      const rwaPrincipalUSD = rwaPrincipal * RWA_PRICE
      const totalUSD = (yieldUSD + rwaPrincipalUSD + usdtPrincipal).toFixed(2)
      
      setData({
        yieldAmount,
        rwaPrincipal: rwaPrincipal.toFixed(2),
        usdtPrincipal: usdtPrincipal.toFixed(2),
        referralAmount: '0',
        dividendAmount: '0',
        dailyWithdrawCount: 0,
        strwaAmount: '0',
        totalUSD,
        loading: false,
        lockedStakes
      })
    } catch (error) {
      console.error('[useWithdrawData] Error:', error)
      setData(prev => ({ ...prev, loading: false }))
    }
  }, [address, isConnected, chainId, stakesLoading, publicClient, userRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...data, refetch: fetchData }
}
