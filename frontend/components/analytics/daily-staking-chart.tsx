'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DailyStakingChartProps {
  timeRange: string
}

export default function DailyStakingChart({ timeRange }: DailyStakingChartProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  // Generate daily staking data
  const generateData = () => {
    const data = []
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      
      data.push({
        date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        newStakes: Math.floor(Math.random() * 150000 + 50000),
        restakes: Math.floor(Math.random() * 80000 + 20000),
      })
    }
    
    return data
  }

  const data = generateData()
  const totalStaked = data.reduce((sum, d) => sum + d.newStakes + d.restakes, 0)

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

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div>
        <div className="text-[15px] font-bold text-[#f1f5f9]">
          {t('analytics.dailyStaking')}
        </div>
        <div className="mt-1 text-[13px] text-[#64748b]">
          {t('analytics.totalStaked')} ${(totalStaked / 1000000).toFixed(2)}M USDT
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
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
            <Bar
              dataKey="newStakes"
              stackId="a"
              fill="#00f5d4"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="restakes"
              stackId="a"
              fill="#00f5d466"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
