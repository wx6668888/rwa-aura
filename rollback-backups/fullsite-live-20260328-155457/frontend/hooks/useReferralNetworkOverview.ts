'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

export interface RefNetOverviewEventRow {
  userAddress?: string
  eventType: string
  amount: string
  timestamp: number
  txHash: string
}

export interface RefNetMemberRow {
  userAddress: string
  usdtWei: string
  rwaWei: string
  usdtEqWei: string
}

export interface RefNetOverviewData {
  dayStart: number
  dayEnd: number
  directReferrals: number
  /** 无限代下级人数（不含本人），来自 referral_bindings 递归；旧接口可能缺省为 0 */
  teamDownlineCount?: number
  teamTodayStakeUsdtWei: string
  teamTodayStakeRwaWei: string
  teamTodayStakeUsdtEqWei: string
  teamTodayWithdrawWei: string
  myTodayStakeUsdtWei: string
  myTodayStakeRwaWei: string
  myTodayStakeUsdtEqWei: string
  myTodayWithdrawWei: string
  teamVolumeWei: string
  teamRetainedWei: string
  teamWithdrawnTotalWei: string
  teamStakesToday: RefNetOverviewEventRow[]
  teamWithdrawsToday: RefNetOverviewEventRow[]
  myStakesToday: Omit<RefNetOverviewEventRow, 'userAddress'>[]
  myWithdrawsToday: Omit<RefNetOverviewEventRow, 'userAddress'>[]
  memberBreakdown: RefNetMemberRow[]
  weekStart?: number
  weekEnd?: number
  monthStart?: number
  monthEnd?: number
  teamWeekStakeUsdtEqWei?: string
  teamWeekWithdrawWei?: string
  teamStakesWeek?: RefNetOverviewEventRow[]
  teamWithdrawsWeek?: RefNetOverviewEventRow[]
  teamMonthStakeUsdtEqWei?: string
  teamMonthWithdrawWei?: string
  teamStakesMonth?: RefNetOverviewEventRow[]
  teamWithdrawsMonth?: RefNetOverviewEventRow[]
  /** 最近 30 个 UTC 自然日（含今日） */
  teamChartDaily30?: Array<{ date: string; stakeUsdtEqWei: string; withdrawWei: string }>
  /** 最近 12 个 UTC 自然月（含当月） */
  teamChartMonthly12?: Array<{ month: string; stakeUsdtEqWei: string; withdrawWei: string }>
  /** @deprecated 使用 teamChartDaily30 */
  teamChart14d?: Array<{ date: string; stakeUsdtEqWei: string; withdrawWei: string }>
}

export function useReferralNetworkOverview() {
  const { address } = useAccount()
  const [data, setData] = useState<RefNetOverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setData(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/data/${address.toLowerCase()}/referral-network-overview`)
      const json = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'overview failed')
      }
      setData(json.data as RefNetOverviewData)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
