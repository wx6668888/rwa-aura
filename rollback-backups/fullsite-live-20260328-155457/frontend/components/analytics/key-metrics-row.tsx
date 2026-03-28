'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import {
  displayUserCount,
  DISPLAY_USER_OFFSET,
  filterSeriesByDays,
  formatUsdAmount,
  formatUsdFull,
} from '@/lib/stats-display'

interface KeyMetricsRowProps {
  timeRange: string
}

function sparkFromValues(values: number[], trend: 'up' | 'down') {
  if (values.length >= 2) {
    return values.map((value) => ({ value: Math.max(0, value) }))
  }
  const data = []
  let value = 100
  for (let i = 0; i < 20; i++) {
    value += trend === 'up' ? Math.random() * 10 - 3 : Math.random() * 10 - 7
    data.push({ value })
  }
  return data
}

export default function KeyMetricsRow({ timeRange }: KeyMetricsRowProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const tvlSeries = filterSeriesByDays(data.tvlCumulative, timeRange)
  const rewardDaily = filterSeriesByDays(data.dailyRewards, timeRange)
  const refSeries = filterSeriesByDays(data.referralGrowth, timeRange)

  const tvlNow = tvlSeries.length ? tvlSeries[tvlSeries.length - 1].tvlUsdt : data.tvlUsdt
  const tvlFirst = tvlSeries.length > 1 ? tvlSeries[0].tvlUsdt : tvlNow
  const tvlChangePct =
    tvlFirst > 0 && Number.isFinite(tvlNow) ? ((tvlNow - tvlFirst) / tvlFirst) * 100 : 0

  const periodRewardUsdt = rewardDaily.reduce(
    (s, r) => s + (r.staticRewards || 0) + (r.referralRewards || 0),
    0
  )

  const usersShown = displayUserCount(data.users)
  let newStakersPeriod = 0
  if (refSeries.length > 1) {
    newStakersPeriod =
      refSeries[refSeries.length - 1].cumulativeStakers - refSeries[0].cumulativeStakers
  } else if (refSeries.length === 1) {
    newStakersPeriod = refSeries[0].newStakersThatDay
  }

  const tvlSpark = sparkFromValues(
    tvlSeries.length >= 2 ? tvlSeries.map((p) => p.tvlUsdt) : [],
    tvlChangePct >= 0 ? 'up' : 'down'
  )
  const userSpark = sparkFromValues(
    refSeries.length >= 2 ? refSeries.map((p) => p.cumulativeStakers + DISPLAY_USER_OFFSET) : [],
    'up'
  )
  const rewardSpark = sparkFromValues(
    rewardDaily.length >= 2
      ? rewardDaily.map((r) => r.staticRewards + r.referralRewards)
      : [],
    'up'
  )

  const metrics = [
    {
      label: t('analytics.tvl'),
      value: formatUsdFull(tvlNow),
      change: `${tvlChangePct >= 0 ? '+' : ''}${tvlChangePct.toFixed(1)}%`,
      trend: tvlChangePct >= 0 ? ('up' as const) : ('down' as const),
      color: '#00f5d4',
      data: tvlSpark,
    },
    {
      label: t('analytics.totalStakers'),
      value: usersShown.toLocaleString(),
      change: newStakersPeriod > 0 ? `+${newStakersPeriod}` : newStakersPeriod < 0 ? `${newStakersPeriod}` : '—',
      changeLabel: t('analytics.thisPeriod'),
      trend: newStakersPeriod >= 0 ? ('up' as const) : ('down' as const),
      color: '#00f5d4',
      data: userSpark,
    },
    {
      label: t('analytics.totalRewarded'),
      value: formatUsdFull(data.totalRewardsTrackedUsdt),
      change: periodRewardUsdt > 0 ? `+${formatUsdAmount(periodRewardUsdt, true)}` : '—',
      changeLabel: t('analytics.thisPeriod'),
      trend: 'up' as const,
      color: '#8b5cf6',
      data: rewardSpark,
    },
    {
      label: t('analytics.rewardRatio'),
      value: `${data.rewardUsagePercent.toFixed(1)}%`,
      change: '',
      trend: 'neutral' as const,
      color: '#10b981',
      isProgress: true,
      progressValue: Math.min(100, Math.max(0, data.rewardUsagePercent)),
      progressNote: `${t('analytics.remainingToLimit')} ${formatUsdAmount(data.remainingRewardCapUsdt, true)}`,
    },
  ]

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="group relative p-5 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl hover:border-[#ffffff1a] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="text-[11px] uppercase tracking-wide text-[#64748b] font-medium">
            {metric.label}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <div
              className="text-[32px] font-[800] text-[#f1f5f9] font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {metric.value}
            </div>
            {metric.change && metric.change !== '—' && (
              <div
                className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                ${metric.trend === 'down' ? 'bg-[#f43f5e10] text-[#f43f5e]' : 'bg-[#10b98110] text-[#10b981]'}
              `}
              >
                {metric.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {metric.change}
                {metric.changeLabel && <span className="ml-1">{metric.changeLabel}</span>}
              </div>
            )}
          </div>

          {metric.isProgress ? (
            <div className="mt-4">
              <div className="relative w-12 h-12 ml-auto">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#1a1a2e" strokeWidth="4" fill="none" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={metric.color}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - metric.progressValue! / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
              <div className="mt-1 text-[11px] text-[#64748b]">{metric.progressNote}</div>
            </div>
          ) : (
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metric.data}>
                  <defs>
                    <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={metric.color} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={false}
                    fill={`url(#gradient-${index})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
