'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KeyMetricsRowProps {
  timeRange: string
}

export default function KeyMetricsRow({ timeRange }: KeyMetricsRowProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  // Generate sparkline data
  const generateSparklineData = (trend: 'up' | 'down') => {
    const data = []
    let value = 100
    for (let i = 0; i < 20; i++) {
      value += trend === 'up' ? Math.random() * 10 - 3 : Math.random() * 10 - 7
      data.push({ value })
    }
    return data
  }

  const metrics = [
    {
      label: t('analytics.tvl'),
      value: '$12,450,000',
      change: '+8.3%',
      trend: 'up' as const,
      color: '#00f5d4',
      data: generateSparklineData('up'),
    },
    {
      label: t('analytics.totalStakers'),
      value: '8,432',
      change: '+234',
      changeLabel: t('analytics.thisPeriod'),
      trend: 'up' as const,
      color: '#00f5d4',
      data: generateSparklineData('up'),
    },
    {
      label: t('analytics.totalRewarded'),
      value: '$892,000',
      change: '+$45,200',
      changeLabel: t('analytics.thisPeriod'),
      trend: 'up' as const,
      color: '#8b5cf6',
      data: generateSparklineData('up'),
    },
    {
      label: t('analytics.rewardRatio'),
      value: '36.4%',
      change: '',
      trend: 'neutral' as const,
      color: '#10b981',
      isProgress: true,
      progressValue: 36.4,
      progressNote: t('analytics.remainingToLimit'),
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
            <div className="text-[32px] font-[800] text-[#f1f5f9] font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {metric.value}
            </div>
            {metric.change && (
              <div className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                ${metric.trend === 'up' ? 'bg-[#10b98110] text-[#10b981]' : 'bg-[#f43f5e10] text-[#f43f5e]'}
              `}>
                {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change}
                {metric.changeLabel && <span className="ml-1">{metric.changeLabel}</span>}
              </div>
            )}
          </div>

          {metric.isProgress ? (
            <div className="mt-4">
              <div className="relative w-12 h-12 ml-auto">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#1a1a2e"
                    strokeWidth="4"
                    fill="none"
                  />
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
              <div className="mt-1 text-[11px] text-[#64748b]">
                {metric.progressNote}
              </div>
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
