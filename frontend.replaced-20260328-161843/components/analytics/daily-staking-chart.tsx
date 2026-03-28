'use client'

import { useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { filterSeriesByDays } from '@/lib/stats-display'

interface DailyStakingChartProps {
  timeRange: string
}

export default function DailyStakingChart({ timeRange }: DailyStakingChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const rows = useMemo(() => {
    const filtered = filterSeriesByDays(data.dailyStakes, timeRange)
    return filtered.map((p) => {
      const [y, m, d] = p.date.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return {
        date: dt.toLocaleDateString(locale?.startsWith('zh') ? 'zh-CN' : 'en-US', {
          month: '2-digit',
          day: '2-digit',
        }),
        // 当前链上入库仅有 RWA 质押事件，新增应展示 totalUsdt，避免“新增全部为 0”误导
        newStakes: p.totalUsdt,
        restakes: 0,
      }
    })
  }, [data.dailyStakes, timeRange, locale])

  const totalStaked = rows.reduce((sum, d) => sum + d.newStakes + d.restakes, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[11px] text-[#64748b] mb-2">{payload[0].payload.date}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00f5d4]" />
              <span className="text-[12px] text-[#64748b]">{t('analytics.newStakes')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#00f5d4]">
                ${(payload[0].value / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00f5d466]" />
              <span className="text-[12px] text-[#64748b]">{t('analytics.restakes')}:</span>
              <span className="text-[13px] font-mono font-bold text-[#00f5d4]">
                ${(payload[1].value / 1000).toFixed(1)}K
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const yTick = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    return `$${(value / 1000).toFixed(0)}K`
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div>
        <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.dailyStaking')}</div>
        <div className="mt-1 text-[13px] text-[#64748b]">
          {t('analytics.totalStaked')}{' '}
          {totalStaked >= 1e6
            ? `$${(totalStaked / 1e6).toFixed(2)}M`
            : `$${(totalStaked / 1000).toFixed(1)}K`}{' '}
          USDT
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#64748b] text-sm">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={yTick}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-[#64748b]">
                    {value === 'newStakes' ? t('analytics.newStakes') : t('analytics.restakes')}
                  </span>
                )}
              />
              <Bar dataKey="newStakes" stackId="a" fill="#00f5d4" radius={[0, 0, 0, 0]} />
              <Bar dataKey="restakes" stackId="a" fill="#00f5d466" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
