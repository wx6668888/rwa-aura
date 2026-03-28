'use client'

import { useState, useEffect } from 'react'

export interface AnalyticsNodeBucket {
  level: number
  count: number
}

export interface AnalyticsDailyStake {
  date: string
  usdt: number
  rwaUsdt: number
  totalUsdt: number
}

export interface AnalyticsTvlPoint {
  date: string
  tvlUsdt: number
}

export interface AnalyticsDailyReward {
  date: string
  staticRewards: number
  referralRewards: number
}

export interface AnalyticsReferralPoint {
  date: string
  totalReferrals: number
  cumulativeStakers: number
  newStakersThatDay: number
}

export interface AnalyticsTopStaker {
  rank: number
  address: string
  level: number
  stakeUsdt: number
  rewardsUsdt: number
  share: number
}

export interface AnalyticsStatsData {
  tvlUsdt: number
  tvlRwa: number
  totalStakedUsdt: number
  totalStakedRwa: number
  price: number
  users: number
  /** 链上 cap 口径，与「累计发放」展示可能不一致 */
  dynamicRewardsPaidUsdt: number
  /** 库内汇总：质押收益（每日结算+提现+rewards 表，取较大口径）+ 推荐 + 分红（USDT） */
  totalRewardsTrackedUsdt: number
  /** 质押静态收益 USDT：yield_settlements / rewards(daily_yield|static) 折算 与 提现记录 取 max */
  staticRewardsPaidTrackedUsdt: number
  referralRewardsPaidTrackedUsdt: number
  dividendPaidTrackedUsdt: number
  maxDynamicRewardsUsdt: number
  rewardUsagePercent: number
  remainingRewardCapUsdt: number
  referralPairs: number
  maxReferralDepth: number
  nodeBuckets: AnalyticsNodeBucket[]
  dailyStakes: AnalyticsDailyStake[]
  tvlCumulative: AnalyticsTvlPoint[]
  dailyRewards: AnalyticsDailyReward[]
  referralGrowth: AnalyticsReferralPoint[]
  topStakers: AnalyticsTopStaker[]
  rewardPoolUsdt: number
  /** owner 钱包 RWA 按 homepage 价格折算的 USDT 等值（国库展示） */
  treasuryOwnerUsdt: number
  /** owner 钱包 RWA 数量（代币本位） */
  treasuryOwnerRwa: number
  treasuryOwnerAddress: string | null
  activeStakers30d: number
  activeRate: number
  updatedAt: number
}

/** 看板数据轮询间隔（毫秒），与下方 setInterval 保持一致 */
export const ANALYTICS_STATS_POLL_MS = 60_000

const empty: AnalyticsStatsData = {
  tvlUsdt: 0,
  tvlRwa: 0,
  totalStakedUsdt: 0,
  totalStakedRwa: 0,
  price: 0.85,
  users: 0,
  dynamicRewardsPaidUsdt: 0,
  totalRewardsTrackedUsdt: 0,
  staticRewardsPaidTrackedUsdt: 0,
  referralRewardsPaidTrackedUsdt: 0,
  dividendPaidTrackedUsdt: 0,
  maxDynamicRewardsUsdt: 0,
  rewardUsagePercent: 0,
  remainingRewardCapUsdt: 0,
  referralPairs: 0,
  maxReferralDepth: 0,
  nodeBuckets: [],
  dailyStakes: [],
  tvlCumulative: [],
  dailyRewards: [],
  referralGrowth: [],
  topStakers: [],
  rewardPoolUsdt: 0,
  treasuryOwnerUsdt: 0,
  treasuryOwnerRwa: 0,
  treasuryOwnerAddress: null,
  activeStakers30d: 0,
  activeRate: 0,
  updatedAt: 0,
}

export function useAnalyticsStats() {
  const [data, setData] = useState<AnalyticsStatsData>(empty)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/stats/analytics')
        const json = await res.json()
        if (!cancelled && json.success && json.data) {
          setData({ ...empty, ...json.data })
        }
      } catch (e) {
        console.error('analytics stats', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, ANALYTICS_STATS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { data, loading }
}
