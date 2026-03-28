'use client'

import { useMemo, useState } from 'react'
import { formatUnits } from 'viem'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type TeamChartDay = { date: string; stakeUsdtEqWei: string; withdrawWei: string }
export type TeamChartMonth = { month: string; stakeUsdtEqWei: string; withdrawWei: string }

type ChartRange = '7d' | '30d' | '12m'

type Props = {
  daily30: TeamChartDay[]
  monthly12: TeamChartMonth[]
  title: string
  subtitle: string
  stakeName: string
  withdrawName: string
  localeBcp47: string
  rangeLabels: { d7: string; d30: string; y12: string }
}

export function TeamActivityChart({
  daily30,
  monthly12,
  title,
  subtitle,
  stakeName,
  withdrawName,
  localeBcp47,
  rangeLabels,
}: Props) {
  const [range, setRange] = useState<ChartRange>('7d')

  const rows = useMemo(() => {
    if (range === '12m') {
      return (monthly12 || []).map((p) => {
        const [y, m] = p.month.split('-').map(Number)
        const dt = new Date(Date.UTC(y, m - 1, 1))
        const label = dt.toLocaleDateString(localeBcp47, {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        })
        let stake = 0
        let wd = 0
        try {
          stake = parseFloat(formatUnits(BigInt(p.stakeUsdtEqWei || '0'), 18))
        } catch {
          stake = 0
        }
        try {
          wd = parseFloat(formatUnits(BigInt(p.withdrawWei || '0'), 18))
        } catch {
          wd = 0
        }
        return { label, stake, withdraw: wd }
      })
    }
    const slice = range === '7d' ? daily30.slice(-7) : daily30
    return slice.map((p) => {
      const [y, m, d] = p.date.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      const label = dt.toLocaleDateString(localeBcp47, {
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      })
      let stake = 0
      let wd = 0
      try {
        stake = parseFloat(formatUnits(BigInt(p.stakeUsdtEqWei || '0'), 18))
      } catch {
        stake = 0
      }
      try {
        wd = parseFloat(formatUnits(BigInt(p.withdrawWei || '0'), 18))
      } catch {
        wd = 0
      }
      return { label, stake, withdraw: wd }
    })
  }, [daily30, monthly12, range, localeBcp47])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const pl = payload[0].payload
      return (
        <div className="rounded-xl border border-[#ffffff1a] bg-[#13131e] p-3 shadow-2xl">
          <div className="mb-2 text-[11px] text-[#64748b]">{pl.label}</div>
          <div className="space-y-1 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00f5d4]" />
              <span className="text-[#64748b]">{stakeName}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#00f5d4]">
                {pl.stake.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="text-[#64748b]">{withdrawName}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#f59e0b]">
                {pl.withdraw.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const yTick = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
    return String(Math.round(v))
  }

  const seg = (id: ChartRange, lab: string) => {
    const on = range === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setRange(id)}
        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors ${
          on
            ? 'bg-[#00f5d42e] text-[#00f5d4]'
            : 'text-[#64748b] hover:bg-[#ffffff08] hover:text-[#94a3b8]'
        }`}
      >
        {lab}
      </button>
    )
  }

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/90 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-[#f1f5f9]">{title}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-[#64748b]">{subtitle}</div>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-[10px] border border-[#ffffff0d] bg-[#08080c] p-0.5">
          {seg('7d', rangeLabels.d7)}
          {seg('30d', rangeLabels.d30)}
          {seg('12m', rangeLabels.y12)}
        </div>
      </div>
      <div className="mt-4 h-[220px]">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#64748b]">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 10 }} tickLine={false} />
              <YAxis stroke="#64748b" style={{ fontSize: 10 }} tickLine={false} tickFormatter={yTick} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                formatter={(value) => <span className="text-[#94a3b8]">{value}</span>}
              />
              <Bar dataKey="stake" name={stakeName} fill="#00f5d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="withdraw" name={withdrawName} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
