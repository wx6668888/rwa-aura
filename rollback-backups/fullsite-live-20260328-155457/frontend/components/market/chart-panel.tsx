'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CandlestickChart } from './charts/candlestick-chart'
import { LineChart } from './charts/line-chart'
import { DepthChart } from './charts/depth-chart'
import { VolumeChart } from './charts/volume-chart'

type ChartType = 'candlestick' | 'line' | 'depth' | 'volume'
type TimeRange = '15m' | '1h' | '4h' | '1d' | '1w'

export function ChartPanel() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [chartType, setChartType] = useState<ChartType>('candlestick')
  const [timeRange, setTimeRange] = useState<TimeRange>('1d')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: 'candlestick', label: t('market.chartKline') },
    { key: 'line', label: t('market.chartLine') },
    { key: 'depth', label: t('market.chartDepth') },
    { key: 'volume', label: t('market.chartVolume') },
  ]

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '15m', label: t('market.time15m') },
    { key: '1h', label: t('market.time1h') },
    { key: '4h', label: t('market.time4h') },
    { key: '1d', label: t('market.time1d') },
    { key: '1w', label: t('market.time1w') },
  ]

  if (!mounted) {
    return (
      <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] p-4 backdrop-blur-xl">
        <div className="h-[400px] animate-pulse bg-[#13131e] rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] p-4 backdrop-blur-xl">
      {/* Chart type switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {chartTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setChartType(type.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                chartType === type.key
                  ? 'bg-[#00f5d4] text-[#05050a]'
                  : 'bg-transparent text-[#64748b] hover:bg-[#13131e]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Time range switcher */}
        {chartType !== 'depth' && (
          <div className="flex gap-1">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                  timeRange === range.key
                    ? 'border border-[#00f5d4] text-[#00f5d4]'
                    : 'text-[#64748b] hover:text-[#f1f5f9]'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="mt-4">
        {chartType === 'candlestick' && <CandlestickChart timeRange={timeRange} />}
        {chartType === 'line' && <LineChart timeRange={timeRange} />}
        {chartType === 'depth' && <DepthChart />}
        {chartType === 'volume' && <VolumeChart timeRange={timeRange} />}
      </div>
    </div>
  )
}
