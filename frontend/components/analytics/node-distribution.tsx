'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function NodeDistribution() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const nodeData = [
    { level: 'V1', name: t('nodes.v1name'), users: 5842, percentage: 69.3, color: '#64748b' },
    { level: 'V2', name: t('nodes.v2name'), users: 1856, percentage: 22.0, color: '#00f5d4' },
    { level: 'V3', name: t('nodes.v3name'), users: 523, percentage: 6.2, color: '#10b981' },
    { level: 'V4', name: t('nodes.v4name'), users: 189, percentage: 2.2, color: '#8b5cf6' },
    { level: 'V5', name: t('nodes.v5name'), users: 22, percentage: 0.3, color: '#f59e0b' },
  ]

  const totalUsers = nodeData.reduce((sum, d) => sum + d.users, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[#13131e] border border-[#ffffff1a] rounded-xl p-3 shadow-2xl">
          <div className="text-[13px] font-bold text-[#f1f5f9] mb-1">
            {data.level} · {data.name}
          </div>
          <div className="text-[12px] text-[#64748b]">
            {data.users.toLocaleString()} {t('analytics.users')} · {data.percentage}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="text-[15px] font-bold text-[#f1f5f9]">
        {t('analytics.nodeDistribution')}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Donut Chart */}
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
              <div className="text-[24px] font-mono font-bold text-[#f1f5f9]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {totalUsers.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#64748b] uppercase tracking-wide">
                {t('analytics.totalUsers')}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats List */}
        <div className="space-y-3">
          {nodeData.map((node, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* Level Badge */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                style={{ backgroundColor: `${node.color}20`, color: node.color }}
              >
                {node.level}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#f1f5f9]">
                  {node.level} · {node.name}
                </div>
                <div className="text-[12px] text-[#64748b]">
                  {node.users.toLocaleString()} {t('analytics.users')} · {node.percentage}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-24">
                <div className="h-1 rounded-full bg-[#1a1a2e] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${node.percentage}%`,
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
