'use client'

import { useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { DISPLAY_USER_OFFSET, filterSeriesByDays } from '@/lib/stats-display'

interface ReferralGrowthChartProps {
  timeRange: string
}

export default function ReferralGrowthChart({ timeRange }: ReferralGrowthChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const rows = useMemo(() => {
    const filtered = filterSeriesByDays(data.referralGrowth, timeRange)
    return filtered.map((p) => {
      const [y, m, d] = p.date.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return {
        date: dt.toLocaleDateString(locale?.startsWith('zh') ? 'zh-CN' : 'en-US', {
          month: '2-digit',
          day: '2-digit',
        }),
        referralPairs: p.totalReferrals,
        cumulativeStakersShown: p.cumulativeStakers + DISPLAY_USER_OFFSET,
      }
    })
  }, [data.referralGrowth, timeRange, locale])

  const avgDirect = data.users > 0 ? (data.referralPairs / data.users).toFixed(2) : '0'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[11px] text-[#64748b] mb-2">{payload[0].payload.date}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00f5d4]" />
              <span className="text-[12px] text-[#64748b]">{t('analytics.totalReferrals')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#00f5d4]">
                {payload[0].value.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              <span className="text-[12px] text-[#64748b]">{t('analytics.activeStakers')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#8b5cf6]">
                {payload[1].value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div>
        <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.referralGrowth')}</div>

        <div className="mt-3 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13131e] border border-[#ffffff0d]">
            <span className="text-[11px] text-[#64748b]">{t('analytics.totalReferrals')}:</span>
            <span
              className="text-[12px] font-mono font-bold text-[#00f5d4]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {data.referralPairs.toLocaleString()}
              {t('analytics.pairs')}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13131e] border border-[#ffffff0d]">
            <span className="text-[11px] text-[#64748b]">{t('analytics.avgReferrals')}:</span>
            <span
              className="text-[12px] font-mono font-bold text-[#00f5d4]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {avgDirect}
              {t('analytics.people')}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13131e] border border-[#ffffff0d]">
            <span className="text-[11px] text-[#64748b]">{t('analytics.maxDepth')}:</span>
            <span
              className="text-[12px] font-mono font-bold text-[#00f5d4]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {data.maxReferralDepth || 0}
              {t('analytics.levels')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#64748b] text-sm">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                iconType="line"
                formatter={(value) => (
                  <span className="text-[#64748b]">
                    {value === 'referralPairs' ? t('analytics.totalReferrals') : t('analytics.activeStakers')}
                  </span>
                )}
              />
              <Line type="monotone" dataKey="referralPairs" stroke="#00f5d4" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="cumulativeStakersShown" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
