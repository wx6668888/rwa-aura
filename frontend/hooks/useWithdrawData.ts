'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useStakingContract } from './useStakingContract'

const INITIAL_DATA = {
  yieldAmount: '0',
  rwaPrincipal: '0',
  usdtPrincipal: '0',
  referralAmount: '0',
  dividendAmount: '0',
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
}

export function useWithdrawData() {
  const { address, isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo, userRewards, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  const [data, setData] = useState(INITIAL_DATA)

  useEffect(() => {
    if (!isConnected || !address) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    let cancelled = false
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
    const usdtTotal = userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : 0
    const rwaTotal = rwaStakeInfo?.totalStakedRWA ? parseFloat(rwaStakeInfo.totalStakedRWA) : 0
    const rwaPending = userRewards?.rwaPending ? parseFloat(userRewards.rwaPending) : 0
    const flexUSDTFallback = usdtFlexiblePrincipal ? parseFloat(usdtFlexiblePrincipal) : usdtTotal
    const flexRWAFallback = rwaFlexiblePrincipal ? parseFloat(rwaFlexiblePrincipal) : rwaTotal

    async function run() {
      try {
        const res = await fetch(`${API_BASE}/api/withdraw-v2/${address}`)
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            const apiData = json.data
            const flexUSDT = usdtFlexiblePrincipal ? parseFloat(usdtFlexiblePrincipal) : 0
            const flexRWA = rwaFlexiblePrincipal ? parseFloat(rwaFlexiblePrincipal) : 0
            const RWA_PRICE = 0.85
            const totalUSD = (
              rwaPending * RWA_PRICE +
              flexRWA * RWA_PRICE +
              flexUSDT +
              parseFloat(apiData.referralAmount || '0') +
              parseFloat(apiData.dividendAmount || '0') +
              parseFloat(apiData.strwaAmount || '0') * RWA_PRICE
            ).toFixed(2)
            setData({
              // 以 withdraw-v2 接口返回值为准，避免链上读取时序导致 pending 偶发为 0
              yieldAmount: (apiData.yieldAmount ?? rwaPending.toFixed(2)).toString(),
              rwaPrincipal: flexRWA.toFixed(2),
              usdtPrincipal: flexUSDT.toFixed(2),
              referralAmount: apiData.referralAmount || '0',
              dividendAmount: apiData.dividendAmount || '0',
              strwaAmount: apiData.strwaAmount || '0',
              totalUSD,
              loading: false,
              lockedStakes: apiData.lockedStakes || []
            })
            return
          }
        }
        const RWA_PRICE = 0.85
        setData({
          yieldAmount: rwaPending.toFixed(2),
          rwaPrincipal: flexRWAFallback.toFixed(2),
          usdtPrincipal: flexUSDTFallback.toFixed(2),
          referralAmount: '0',
          dividendAmount: '0',
          strwaAmount: '0',
          totalUSD: ((rwaPending + flexRWAFallback) * RWA_PRICE + flexUSDTFallback).toFixed(2),
          loading: false,
          lockedStakes: []
        })
      } catch (error) {
        if (!cancelled) {
          console.error('[useWithdrawData] Error:', error)
          setData(prev => ({ ...prev, loading: false }))
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [
    address,
    isConnected,
    userStakeInfo?.totalStaked,
    rwaStakeInfo?.totalStakedRWA,
    userRewards?.rwaPending,
    rwaFlexiblePrincipal,
    usdtFlexiblePrincipal
  ])

  const refetch = useCallback(() => {
    if (!address || !isConnected) return
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
    const usdtTotal = userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : 0
    const rwaTotal = rwaStakeInfo?.totalStakedRWA ? parseFloat(rwaStakeInfo.totalStakedRWA) : 0
    const rwaPending = userRewards?.rwaPending ? parseFloat(userRewards.rwaPending) : 0
    const flexUSDT = usdtFlexiblePrincipal ? parseFloat(usdtFlexiblePrincipal) : usdtTotal
    const flexRWA = rwaFlexiblePrincipal ? parseFloat(rwaFlexiblePrincipal) : rwaTotal
    setData(prev => ({ ...prev, loading: true }))
    fetch(`${API_BASE}/api/withdraw-v2/${address}`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!json?.success) {
          const RWA_PRICE = 0.85
          setData({
            yieldAmount: rwaPending.toFixed(2),
            rwaPrincipal: flexRWA.toFixed(2),
            usdtPrincipal: flexUSDT.toFixed(2),
            referralAmount: '0',
            dividendAmount: '0',
            strwaAmount: '0',
            totalUSD: ((rwaPending + flexRWA) * RWA_PRICE + flexUSDT).toFixed(2),
            loading: false,
            lockedStakes: []
          })
          return
        }
        const apiData = json.data
        const RWA_PRICE = 0.85
        const totalUSD = (
          rwaPending * RWA_PRICE + flexRWA * RWA_PRICE + flexUSDT +
          parseFloat(apiData.referralAmount || '0') + parseFloat(apiData.dividendAmount || '0') +
          parseFloat(apiData.strwaAmount || '0') * RWA_PRICE
        ).toFixed(2)
        setData({
          // 以 withdraw-v2 接口返回值为准，避免链上读取时序导致 pending 偶发为 0
          yieldAmount: (apiData.yieldAmount ?? rwaPending.toFixed(2)).toString(),
          rwaPrincipal: flexRWA.toFixed(2),
          usdtPrincipal: flexUSDT.toFixed(2),
          referralAmount: apiData.referralAmount || '0',
          dividendAmount: apiData.dividendAmount || '0',
          strwaAmount: apiData.strwaAmount || '0',
          totalUSD,
          loading: false,
          lockedStakes: apiData.lockedStakes || []
        })
      })
      .catch(err => {
        console.error('[useWithdrawData] refetch Error:', err)
        setData(prev => ({ ...prev, loading: false }))
      })
  }, [address, isConnected, userStakeInfo?.totalStaked, rwaStakeInfo?.totalStakedRWA, userRewards?.rwaPending, rwaFlexiblePrincipal, usdtFlexiblePrincipal])

  return { ...data, refetch }
}
