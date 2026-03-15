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
      const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
      
      const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
      const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
      // 开发环境模拟数据
      const mockYield = address?.toLowerCase() === '0xa941f4806e0e3ea7577aec6c015d6e9d91584638' ? 5 : 0
      const yieldAmount = (usdtRwaPending + rwaRwaPending + mockYield).toFixed(2)
      
      // Read referral rewards from ReferralRewardPool
      let referralAmount = '0'
      if (addresses?.ReferralRewardPool) {
        try {
          const balance = await publicClient.readContract({
            address: addresses.ReferralRewardPool as `0x${string}`,
            abi: [{
              name: 'withdrawableBalance',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'user', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }],
            functionName: 'withdrawableBalance',
            args: [address],
          }) as bigint
          referralAmount = (Number(balance) / 1e6).toFixed(2)
        } catch (err) {
          console.warn('[useWithdrawData] Failed to read referral balance:', err)
        }
      }
      
      // Read stRWA balance
      let strwaAmount = '0'
      if (addresses?.stRWA) {
        try {
          const balance = await publicClient.readContract({
            address: addresses.stRWA as `0x${string}`,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }],
            functionName: 'balanceOf',
            args: [address],
          }) as bigint
          strwaAmount = (Number(balance) / 1e18).toFixed(2)
        } catch (err) {
          console.warn('[useWithdrawData] Failed to read stRWA balance:', err)
        }
      }
      
      // Read dividend from StakingContract
      let dividendAmount = '0'
      if (addresses?.stakingContract) {
        try {
          const dividend = await publicClient.readContract({
            address: addresses.stakingContract as `0x${string}`,
            abi: [{
              name: 'dividends',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'user', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }],
            functionName: 'dividends',
            args: [address],
          }) as bigint
          dividendAmount = (Number(dividend) / 1e6).toFixed(2)
        } catch (err) {
          console.warn('[useWithdrawData] Failed to read dividend:', err)
        }
      }
      
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
              amount: (Number(rwaAmounts[i]) / 1e18) * 2, // 合约存储的是50%，显示用户质押的100%
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
              amount: (Number(usdtAmounts[i]) / 1e18) * 2, // 合约存储的是50%，显示用户质押的100%
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
      const referralUSD = parseFloat(referralAmount)
      const dividendUSD = parseFloat(dividendAmount)
      const strwaUSD = parseFloat(strwaAmount) * RWA_PRICE
      const totalUSD = (yieldUSD + rwaPrincipalUSD + usdtPrincipal + referralUSD + dividendUSD + strwaUSD).toFixed(2)
      
      setData({
        yieldAmount,
        rwaPrincipal: rwaPrincipal.toFixed(2),
        usdtPrincipal: usdtPrincipal.toFixed(2),
        referralAmount,
        dividendAmount,
        dailyWithdrawCount: 0,
        strwaAmount,
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
