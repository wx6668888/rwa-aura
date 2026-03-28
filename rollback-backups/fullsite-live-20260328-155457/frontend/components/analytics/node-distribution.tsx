'use client'

import { useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'

const COLORS = [
  '#64748b',
  '#00f5d4',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#eab308',
  '#f97316',
]
const LEVEL_KEYS = [
  'nodes.l1name',
  'nodes.l2name',
  'nodes.l3name',
  'nodes.l4name',
  'nodes.l5name',
  'nodes.l6name',
  'nodes.l7name',
  'nodes.l8name',
  'nodes.l9name',
] as const

export default function NodeDistribution() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const nodeData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (const b of data.nodeBuckets) {
      const idx = Math.min(Math.max(b.level, 1), 9) - 1
      counts[idx] += b.count
    }
    const total = counts.reduce((a, b) => a + b, 0) || 1
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level, i) => ({
      level: `L${level}`,
      name: t(LEVEL_KEYS[i]),
      users: counts[i],
      percentage: Math.round((counts[i] / total) * 1000) / 10,
      color: COLORS[i],
    }))
  }, [data.nodeBuckets, t])

  const totalUsers = useMemo(() => {
    const sum = nodeData.reduce((s, n) => s + n.users, 0)
    return sum > 0 ? sum : Math.max(0, data.users)
  }, [nodeData, data.users])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[13px] font-bold text-[#f1f5f9] mb-1">
            {row.level} · {row.name}
          </div>
          <div className="text-[12px] text-[#64748b]">
            {row.users.toLocaleString()} {t('analytics.users')} · {row.percentage}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.nodeDistribution')}</div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex items-center justify-center">
          <div className="relative w-[240px] h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nodeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="users"
                >
                  {nodeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div
                className="text-[24px] font-mono font-bold text-[#f1f5f9]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {totalUsers.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#64748b] uppercase tracking-wide">{t('analytics.totalUsers')}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {nodeData.map((node, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                style={{ backgroundColor: `${node.color}20`, color: node.color }}
              >
                {node.level}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#f1f5f9]">
                  {node.level} · {node.name}
                </div>
                <div className="text-[12px] text-[#64748b]">
                  {node.users.toLocaleString()} {t('analytics.users')} · {node.percentage}%
                </div>
              </div>

              <div className="w-24">
                <div className="h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, node.percentage)}%`,
                      backgroundColor: node.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
