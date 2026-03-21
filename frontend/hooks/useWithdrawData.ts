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

/** 链上可提现 RWA 收益 = USDT 质押累计的 rwaPending + RWA 质押侧的 rwaPending（与 RwaWithdrawCard 一致） */
function chainSettledRwaYield(userRewards: { rwaPending?: string } | null, rwaStakeInfo: { rwaPending?: string } | null): number {
  const a = userRewards?.rwaPending ? parseFloat(userRewards.rwaPending) : 0
  const b = rwaStakeInfo?.rwaPending ? parseFloat(rwaStakeInfo.rwaPending) : 0
  return a + b
}

function formatYieldAmountString(n: number): string {
  if (!(n > 0)) return '0'
  const s = n.toFixed(8).replace(/\.?0+$/, '')
  return s || '0'
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
    // 浏览器端默认走同域 /api，避免误指向用户本机 localhost
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || ''
    const usdtTotal = userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : 0
    const rwaTotal = rwaStakeInfo?.totalStakedRWA ? parseFloat(rwaStakeInfo.totalStakedRWA) : 0
    const chainYieldRwa = chainSettledRwaYield(userRewards, rwaStakeInfo)
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
            // user_stats 可能滞后于链上 updateUserRewards；展示与汇总以链上为准，并与接口取较大值兜底
            const apiYieldParsed = parseFloat(String(apiData.yieldAmount || '0')) || 0
            const yieldAmountNum = Math.max(chainYieldRwa, apiYieldParsed)
            const yieldAmountStr = formatYieldAmountString(yieldAmountNum)
            const totalUSD = (
              yieldAmountNum * RWA_PRICE +
              flexRWA * RWA_PRICE +
              flexUSDT +
              parseFloat(apiData.referralAmount || '0') +
              parseFloat(apiData.dividendAmount || '0') +
              parseFloat(apiData.strwaAmount || '0') * RWA_PRICE
            ).toFixed(2)
            setData({
              yieldAmount: yieldAmountStr,
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
          yieldAmount: formatYieldAmountString(chainYieldRwa),
          rwaPrincipal: flexRWAFallback.toFixed(2),
          usdtPrincipal: flexUSDTFallback.toFixed(2),
          referralAmount: '0',
          dividendAmount: '0',
          strwaAmount: '0',
          totalUSD: ((chainYieldRwa + flexRWAFallback) * RWA_PRICE + flexUSDTFallback).toFixed(2),
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
    rwaStakeInfo?.rwaPending,
    rwaFlexiblePrincipal,
    usdtFlexiblePrincipal
  ])

  const refetch = useCallback(() => {
    if (!address || !isConnected) return
    // 浏览器端默认走同域 /api，避免误指向用户本机 localhost
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || ''
    const usdtTotal = userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : 0
    const rwaTotal = rwaStakeInfo?.totalStakedRWA ? parseFloat(rwaStakeInfo.totalStakedRWA) : 0
    const chainYieldRwa = chainSettledRwaYield(userRewards, rwaStakeInfo)
    const flexUSDT = usdtFlexiblePrincipal ? parseFloat(usdtFlexiblePrincipal) : usdtTotal
    const flexRWA = rwaFlexiblePrincipal ? parseFloat(rwaFlexiblePrincipal) : rwaTotal
    setData(prev => ({ ...prev, loading: true }))
    fetch(`${API_BASE}/api/withdraw-v2/${address}`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!json?.success) {
          const RWA_PRICE = 0.85
          setData({
            yieldAmount: formatYieldAmountString(chainYieldRwa),
            rwaPrincipal: flexRWA.toFixed(2),
            usdtPrincipal: flexUSDT.toFixed(2),
            referralAmount: '0',
            dividendAmount: '0',
            strwaAmount: '0',
            totalUSD: ((chainYieldRwa + flexRWA) * RWA_PRICE + flexUSDT).toFixed(2),
            loading: false,
            lockedStakes: []
          })
          return
        }
        const apiData = json.data
        const RWA_PRICE = 0.85
        const apiYieldParsed = parseFloat(String(apiData.yieldAmount || '0')) || 0
        const yieldAmountNum = Math.max(chainYieldRwa, apiYieldParsed)
        const yieldAmountStr = formatYieldAmountString(yieldAmountNum)
        const totalUSD = (
          yieldAmountNum * RWA_PRICE + flexRWA * RWA_PRICE + flexUSDT +
          parseFloat(apiData.referralAmount || '0') + parseFloat(apiData.dividendAmount || '0') +
          parseFloat(apiData.strwaAmount || '0') * RWA_PRICE
        ).toFixed(2)
        setData({
          yieldAmount: yieldAmountStr,
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
  }, [address, isConnected, userStakeInfo?.totalStaked, rwaStakeInfo?.totalStakedRWA, userRewards?.rwaPending, rwaStakeInfo?.rwaPending, rwaFlexiblePrincipal, usdtFlexiblePrincipal])

  return { ...data, refetch }
}
