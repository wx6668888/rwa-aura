'use client'

import { estimatedDailyDividendPercent } from '@/lib/network-page-doc'
import type { NodeLevelConfig } from '@/lib/node-levels'

type Props = {
  teamRetainedUsdt: number
  levelConfig: NodeLevelConfig
  level: number
  todayEstimateUsdt: string
  loading: boolean
  labels: {
    title: string
    badge: string
    base: string
    rate: string
    today: string
    rowBase: string
    rowLevels: string
    rowRate: string
    rowSettle: string
    valBase: string
    valLevels: string
    valSettle: string
    foot: string
  }
}

export function DividendModule({ teamRetainedUsdt, levelConfig, level, todayEstimateUsdt, loading, labels }: Props) {
  const pct = estimatedDailyDividendPercent(level, levelConfig.dividendWeight)
  const rateLabel = `${pct.toFixed(2)}%`

  return (
    <section
      className="mx-5 mb-2 rounded-2xl border border-[#f59e0b2e] p-4 shadow-[0_8px_24px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(245,158,11,0.10)]"
      style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))' }}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#f59e0bb3]">✨ {labels.title}</span>
        <span className="rounded-md border border-[#f59e0b33] bg-[#f59e0b1f] px-2.5 py-0.5 text-[10px] font-bold text-[#f59e0b]">
          {labels.badge}
        </span>
      </div>
      <div className="mb-3.5 grid grid-cols-3 gap-2.5">
        <Cell label={labels.base} value={loading ? '…' : teamRetainedUsdt.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
        <Cell label={labels.rate} value={loading ? '…' : rateLabel} />
        <Cell label={labels.today} value={loading ? '…' : todayEstimateUsdt} />
      </div>
      <div className="rounded-[10px] border border-[#f59e0b1a] bg-[#f59e0b0f] p-3">
        <Row k={labels.rowBase} v={labels.valBase} />
        <Row k={labels.rowLevels} v={labels.valLevels} />
        <Row k={labels.rowRate.replace('{lv}', `L${level}`)} v={rateLabel} />
        <Row k={labels.rowSettle} v={labels.valSettle} />
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#475569]">{labels.foot}</p>
      </div>
    </section>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#f59e0b80]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-base font-semibold text-[#f59e0b]">{value}</p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  if (!v && k === '') return null
  return (
    <div className="flex justify-between gap-2 border-b border-[#ffffff08] py-1.5 last:border-0">
      <span className="text-[11px] text-[#94a3b8]">{k}</span>
      {v ? <span className="text-right font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold text-[#f59e0b]">{v}</span> : null}
    </div>
  )
}
