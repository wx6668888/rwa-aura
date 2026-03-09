'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'

interface TvlHistoryChartProps {
  timeRange: string
}

export default function TvlHistoryChart({ timeRange }: TvlHistoryChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // Generate realistic TVL data
  const generateTvlData = () => {
    const data = []
    let value = 4000000
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '180d' ? 180 : 365
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      
      // Add growth trend with realistic fluctuations
      value += (Math.random() * 200000 - 50000) + (i * 30000)
      
      // Add occasional dips
      if (Math.random() > 0.95) {
        value *= 0.95
      }
      
      data.push({
        date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        tvl: Math.max(value, 4000000),
        change: Math.random() * 4 - 1,
      })
    }
    
    return data
  }

  const data = generateTvlData()
  const currentTvl = data[data.length - 1].tvl
  const athTvl = Math.max(...data.map(d => d.tvl))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[11px] text-[#64748b] mb-1">{payload[0].payload.date}</div>
          <div className="text-[14px] font-mono font-bold text-[#00f5d4]">
            ${(payload[0].value / 1000000).toFixed(2)}M
          </div>
          <div className={`text-[12px] mt-1 ${payload[0].payload.change >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
            {payload[0].payload.change >= 0 ? '▲' : '▼'} {Math.abs(payload[0].payload.change).toFixed(2)}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[15px] font-bold text-[#f1f5f9]">
              {t('analytics.tvlHistory')}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[20px] font-mono font-bold text-[#00f5d4]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ${(currentTvl / 1000000).toFixed(2)}M
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10b98110] text-[#10b981]">
                <TrendingUp className="w-3 h-3" />
                +8.3%
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`
              px-4 h-9 rounded-lg text-[13px] font-medium transition-all duration-200
              ${chartType === 'line'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'border border-[#ffffff1a] text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
              }
            `}
          >
            {t('analytics.lineChart')}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`
              px-4 h-9 rounded-lg text-[13px] font-medium transition-all duration-200
              ${chartType === 'bar'
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
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f5d4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00f5d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '11px' }}
                tickLine={false}
                orientation="right"
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={athTvl}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `${t('analytics.ath')} $${(athTvl / 1000000).toFixed(2)}M`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#00f5d4"
                strokeWidth={2}
                fill="url(#tvlGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f5d4" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#00f5d4" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '11px' }}
                tickLine={false}
                orientation="right"
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={athTvl}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `${t('analytics.ath')} $${(athTvl / 1000000).toFixed(2)}M`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="tvl"
                fill="url(#barGradient)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
