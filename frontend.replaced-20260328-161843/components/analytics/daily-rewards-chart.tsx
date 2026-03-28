'use client'

import { useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { filterSeriesByDays } from '@/lib/stats-display'

interface DailyRewardsChartProps {
  timeRange: string
}

export default function DailyRewardsChart({ timeRange }: DailyRewardsChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const rows = useMemo(() => {
    const filtered = filterSeriesByDays(data.dailyRewards, timeRange)
    return filtered.map((p) => {
      const [y, m, d] = p.date.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return {
        date: dt.toLocaleDateString(locale?.startsWith('zh') ? 'zh-CN' : 'en-US', {
          month: '2-digit',
          day: '2-digit',
        }),
        staticRewards: p.staticRewards,
        referralRewards: p.referralRewards,
      }
    })
  }, [data.dailyRewards, timeRange, locale])

  const totalRewards = rows.reduce((sum, d) => sum + d.staticRewards + d.referralRewards, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[11px] text-[#64748b] mb-2">{payload[0].payload.date}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              <span className="text-[12px] text-[#64748b]">{t('analytics.staticRewards')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#8b5cf6]">
                ${(payload[0].value / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" style={{ opacity: 0.6 }} />
              <span className="text-[12px] text-[#64748b]">{t('analytics.referralRewards')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#8b5cf6]">
                ${(payload[1].value / 1000).toFixed(1)}K
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
        <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.dailyRewards')}</div>
        <div className="mt-1 text-[13px] text-[#64748b]">
          {t('analytics.totalRewards')}{' '}
          {totalRewards >= 1000
            ? `$${(totalRewards / 1000).toFixed(0)}K`
            : `$${totalRewards.toFixed(0)}`}{' '}
          USDT
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#64748b] text-sm">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="staticGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="refGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => (
                  <span className="text-[#64748b]">
                    {value === 'staticRewards' ? t('analytics.staticRewards') : t('analytics.referralRewards')}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="staticRewards"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#staticGradient)"
              />
              <Area
                type="monotone"
                dataKey="referralRewards"
                stackId="1"
                stroke="#a78bfa"
                fill="url(#refGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
