'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { filterSeriesByDays } from '@/lib/stats-display'

interface TvlHistoryChartProps {
  timeRange: string
}

export default function TvlHistoryChart({ timeRange }: TvlHistoryChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const { data } = useAnalyticsStats()

  const raw = filterSeriesByDays(data.tvlCumulative, timeRange)

  const dataChart = useMemo(() => {
    return raw.map((p, i) => {
      const prev = i > 0 ? raw[i - 1].tvlUsdt : p.tvlUsdt
      const change = prev > 0 ? ((p.tvlUsdt - prev) / prev) * 100 : 0
      const d = parseIso(p.date)
      return {
        date: d.toLocaleDateString(locale?.startsWith('zh') ? 'zh-CN' : 'en-US', {
          month: '2-digit',
          day: '2-digit',
        }),
        tvl: p.tvlUsdt,
        change,
      }
    })
  }, [raw, locale])

  const currentTvl = dataChart.length ? dataChart[dataChart.length - 1].tvl : data.tvlUsdt
  const athTvl = dataChart.length ? Math.max(...dataChart.map((d) => d.tvl)) : currentTvl
  const firstTvl = dataChart.length > 1 ? dataChart[0].tvl : currentTvl
  const rangePct = firstTvl > 0 ? ((currentTvl - firstTvl) / firstTvl) * 100 : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[11px] text-[#64748b] mb-1">{payload[0].payload.date}</div>
          <div className="text-[14px] font-mono font-bold text-[#00f5d4]">
            ${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div
            className={`text-[12px] mt-1 ${payload[0].payload.change >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}
          >
            {payload[0].payload.change >= 0 ? '▲' : '▼'} {Math.abs(payload[0].payload.change).toFixed(2)}%
          </div>
        </div>
      )
    }
    return null
  }

  const yTick = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.tvlHistory')}</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="text-[20px] font-mono font-bold text-[#00f5d4]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                $
                {currentTvl >= 1e6
                  ? `${(currentTvl / 1e6).toFixed(2)}M`
                  : currentTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  rangePct >= 0 ? 'bg-[#10b98110] text-[#10b981]' : 'bg-[#f43f5e10] text-[#f43f5e]'
                }`}
              >
                {rangePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {rangePct >= 0 ? '+' : ''}
                {rangePct.toFixed(1)}%
              </span>
            </div>
          </div>
          <BarChart3 className="w-8 h-8 text-[#00f5d4] opacity-50 hidden sm:block" />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`
              px-4 h-9 rounded-lg text-[13px] font-medium transition-all duration-200
              ${
                chartType === 'line'
                  ? 'bg-[#00f5d4] text-[#05050a]'
                  : 'border border-[#ffffff1a] text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
              }
            `}
          >
            {t('analytics.lineChart')}
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`
              px-4 h-9 rounded-lg text-[13px] font-medium transition-all duration-200
              ${
                chartType === 'bar'
                  ? 'bg-[#00f5d4] text-[#05050a]'
                  : 'border border-[#ffffff1a] text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
              }
            `}
          >
            {t('analytics.barChart')}
          </button>
        </div>
      </div>

      <div className="mt-4 h-[280px]">
        {dataChart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#64748b] text-sm">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <AreaChart data={dataChart}>
                <defs>
                  <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f5d4" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00f5d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                  orientation="right"
                  tickFormatter={yTick}
                />
                <Tooltip content={<CustomTooltip />} />
                {athTvl > 0 && (
                  <ReferenceLine
                    y={athTvl}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                      value: `${t('analytics.ath')} ${yTick(athTvl)}`,
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 11,
                    }}
                  />
                )}
                <Area type="monotone" dataKey="tvl" stroke="#00f5d4" strokeWidth={2} fill="url(#tvlGradient)" />
              </AreaChart>
            ) : (
              <BarChart data={dataChart}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f5d4" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#00f5d4" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                  orientation="right"
                  tickFormatter={yTick}
                />
                <Tooltip content={<CustomTooltip />} />
                {athTvl > 0 && (
                  <ReferenceLine
                    y={athTvl}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                      value: `${t('analytics.ath')} ${yTick(athTvl)}`,
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar dataKey="tvl" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function parseIso(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
