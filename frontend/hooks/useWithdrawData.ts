'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useStakesContext } from '@/contexts/StakesContext'
import { useStakingContract } from './useStakingContract'
import { formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

export function useWithdrawData() {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { stakes, loading: stakesLoading } = useStakesContext()
  const { userRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  
  // Fetch remaining principals from API
  const [apiData, setApiData] = useState<any>(null)
  useEffect(() => {
    if (!address) return
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
    fetch(`${API_BASE}/api/data/${address}/stakes`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setApiData(json.data)
      })
      .catch(() => {})
  }, [address])
  
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
    if (!isConnected || !address || stakesLoading || !publicClient || !chainId || !apiData) {
      setData(prev => ({ ...prev, loading: stakesLoading || !apiData }))
      return
    }

    try {
      const RWA_PRICE = 0.85
      
      const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
      const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
      const yieldAmount = (usdtRwaPending + rwaRwaPending).toFixed(2)
      
      // Calculate flexible remaining from API data
      const apiTotalUSDT = parseFloat(apiData.usdtStaked) / 1e18
      const apiTotalRWA = parseFloat(apiData.rwaStaked) / 1e18
      
      const totalLockedUSDT = stakes.filter(s => {
        const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toUpperCase().startsWith('RWA_'))
        const isFlex = s.lockPeriod === 'flexible'
        return !isRWA && !isFlex
      }).reduce((sum, s) => sum + parseFloat(s.amount) / 1e18, 0)
      
      const totalLockedRWA = stakes.filter(s => {
        const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toUpperCase().startsWith('RWA_'))
        const isFlex = s.lockPeriod === 'flexible'
        return isRWA && !isFlex
      }).reduce((sum, s) => sum + parseFloat(s.amount) / 1e18, 0)
      
      const usdtPrincipal = Math.max(0, apiTotalUSDT - totalLockedUSDT)
      const rwaPrincipal = Math.max(0, apiTotalRWA - totalLockedRWA)
      
      console.log('🔍 Withdraw Data - stakes:', stakes.length, stakes.slice(0, 2))
      console.log('🔍 Withdraw Data:', { apiTotalUSDT, totalLockedUSDT, usdtPrincipal, apiTotalRWA, totalLockedRWA, rwaPrincipal })
      
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
  }, [address, isConnected, chainId, stakesLoading, publicClient, userRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal, apiData, stakes])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...data, refetch: fetchData }
}
