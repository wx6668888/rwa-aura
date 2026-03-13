'use client'
import { useState, useEffect, useCallback } from 'react'
import { useState, useEffect } from 'react'
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
      if (!isConnected || !address || stakesLoading || !publicClient || !chainId) {
        setData(prev => ({ ...prev, loading: stakesLoading }))
        return
      }

      try {
        const RWA_PRICE = 0.85
        
        // RWA 收益
        const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
        const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
        const yieldAmount = (usdtRwaPending + rwaRwaPending).toFixed(2)
        
        // 灵活期本金（useStakingContract 已经返回全额，不需要乘以2）
        const usdtPrincipal = parseFloat(usdtFlexiblePrincipal || '0')
        const rwaPrincipal = parseFloat(rwaFlexiblePrincipal || '0')
        
        // 从合约读取锁仓订单
        const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
        let lockedStakes: any[] = []
        
        if (addresses?.stakingContract) {
          try {
            // 读取 RWA 锁仓列表
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
            
            // 读取 USDT 锁仓列表
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
            
            // 合并 RWA 锁仓订单
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
            
            // 合并 USDT 锁仓订单
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
            console.warn('[useWithdrawData] 读取锁仓列表失败:', err)
          }
        }
        
        console.log('[useWithdrawData] 锁仓订单:', {
          lockedStakes: lockedStakes.length,
          stakes: lockedStakes
        })
        
        // 计算总额
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

function getLockSeconds(lockPeriod: string): number {
  switch (lockPeriod) {
    case '30': return 30 * 86400
    case '60': return 60 * 86400
    case '90': return 90 * 86400
    case '180': return 180 * 86400
    case '365': return 365 * 86400
    default: return 0
  }
}
