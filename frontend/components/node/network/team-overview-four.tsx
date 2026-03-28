'use client'

import { Coins, Users, Sparkles, TrendingUp } from 'lucide-react'
import { ShimmerBlock } from './loading-skeleton'

type Props = {
  teamStakeUsdt: number
  members: number
  totalDividendUsdt: string
  dailyDividendUsdt: string
  trendUp: boolean
  loading: boolean
  labels: {
    teamStake: string
    members: string
    totalDiv: string
    dailyDiv: string
    subStake: string
    subMembers: string
    subTotal: string
    subDaily: string
    trend: string
  }
}

export function TeamOverviewFour({
  teamStakeUsdt,
  members,
  totalDividendUsdt,
  dailyDividendUsdt,
  trendUp,
  loading,
  labels,
}: Props) {
  const cards = [
    {
      icon: Coins,
      color: '#00f5d4',
      bg: 'rgba(0,245,212,0.12)',
      label: labels.teamStake,
      sub: labels.subStake,
      val: loading ? null : teamStakeUsdt.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    },
    {
      icon: Users,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
      label: labels.members,
      sub: labels.subMembers,
      val: loading ? null : String(members),
    },
    {
      icon: Sparkles,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      label: labels.totalDiv,
      sub: labels.subTotal,
      val: loading ? null : totalDividendUsdt,
    },
    {
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      label: labels.dailyDiv,
      sub: labels.subDaily,
      val: loading ? null : dailyDividendUsdt,
    },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-2.5 px-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-[#ffffff0f] bg-[#0d0d14] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ffffff1a]"
        >
          <div
            className="mb-3 flex h-8 w-8 items-center justify-center rounded-[9px]"
            style={{ background: c.bg }}
          >
            <c.icon className="h-4 w-4" style={{ color: c.color }} />
          </div>
          <p className="text-[10px] text-[#475569]">{c.label}</p>
          {c.val === null ? (
            <ShimmerBlock className="mt-2 h-6 w-24" />
          ) : (
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold text-[#f1f5f9]">{c.val}</p>
          )}
          <p className="mt-1 text-[10px] text-[#475569]">{c.sub}</p>
          <p className={`mt-1 flex items-center gap-0.5 text-[10px] ${trendUp ? 'text-[#22c55e]' : 'text-[#475569]'}`}>
            {trendUp ? '↑' : '—'} {labels.trend}
          </p>
        </div>
      ))}
    </div>
  )
}
