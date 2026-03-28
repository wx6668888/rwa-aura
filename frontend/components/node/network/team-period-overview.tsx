'use client'

import { useMemo, useState, type ComponentType } from 'react'
import { formatUnits } from 'viem'
import { X, TrendingUp, ArrowDownRight, Calendar, CalendarDays } from 'lucide-react'
import type { RefNetOverviewData, RefNetOverviewEventRow } from '@/hooks/useReferralNetworkOverview'
import { RefNetEventsTable } from '@/components/nodes/referral-network-team-overview'

function fmtUsdtFromWei(wei: string) {
  try {
    const n = parseFloat(formatUnits(BigInt(wei || '0'), 18))
    if (!Number.isFinite(n)) return '0'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } catch {
    return '0'
  }
}

type DetailKind =
  | 'todayStake'
  | 'todayWd'
  | 'weekStake'
  | 'weekWd'
  | 'monthStake'
  | 'monthWd'
  | null

type Labels = {
  todayStake: string
  todayWd: string
  weekStake: string
  weekWd: string
  monthStake: string
  monthWd: string
  subStake: string
  subWd: string
  periodWeek: string
  periodMonth: string
  utcNote: string
  mixedWd: string
}

type Props = {
  data: RefNetOverviewData | null
  loading: boolean
  chainId: number
  localeKey: string
  labels: Labels
  t: (k: string) => string
}

export function TeamPeriodOverview({ data, loading, chainId, localeKey, labels, t }: Props) {
  const [detail, setDetail] = useState<DetailKind>(null)

  const weekLabel = useMemo(() => {
    if (!data?.weekStart) return ''
    const a = new Date(data.weekStart * 1000).toLocaleDateString(localeKey, { timeZone: 'UTC' })
    const b = new Date(((data.weekEnd || 0) - 86400) * 1000).toLocaleDateString(localeKey, { timeZone: 'UTC' })
    return `${a} – ${b} UTC`
  }, [data?.weekStart, data?.weekEnd, localeKey])

  const monthLabel = useMemo(() => {
    if (!data?.monthStart) return ''
    return new Date(data.monthStart * 1000).toLocaleDateString(localeKey, {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
    })
  }, [data?.monthStart, localeKey])

  const dayLabel = useMemo(() => {
    if (!data?.dayStart) return ''
    return new Date(data.dayStart * 1000).toLocaleDateString(localeKey, {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }, [data?.dayStart, localeKey])

  return (
    <div className="mt-3 px-0">
      <div className="grid grid-cols-2 gap-2.5 px-5">
        <PeriodCard
          icon={TrendingUp}
          tone="cyan"
          label={labels.todayStake}
          value={data ? fmtUsdtFromWei(data.teamTodayStakeUsdtEqWei) : '—'}
          sub={labels.subStake}
          loading={loading}
          onClick={() => setDetail('todayStake')}
        />
        <PeriodCard
          icon={ArrowDownRight}
          tone="amber"
          label={labels.todayWd}
          value={data ? fmtUsdtFromWei(data.teamTodayWithdrawWei) : '—'}
          sub={labels.subWd}
          loading={loading}
          onClick={() => setDetail('todayWd')}
        />
        <PeriodCard
          icon={Calendar}
          tone="purple"
          label={labels.weekStake}
          value={data ? fmtUsdtFromWei(data.teamWeekStakeUsdtEqWei || '0') : '—'}
          sub={labels.subStake}
          loading={loading}
          onClick={() => setDetail('weekStake')}
        />
        <PeriodCard
          icon={ArrowDownRight}
          tone="rose"
          label={labels.weekWd}
          value={data ? fmtUsdtFromWei(data.teamWeekWithdrawWei || '0') : '—'}
          sub={labels.subWd}
          loading={loading}
          onClick={() => setDetail('weekWd')}
        />
        <PeriodCard
          icon={CalendarDays}
          tone="green"
          label={labels.monthStake}
          value={data ? fmtUsdtFromWei(data.teamMonthStakeUsdtEqWei || '0') : '—'}
          sub={labels.subStake}
          loading={loading}
          onClick={() => setDetail('monthStake')}
        />
        <PeriodCard
          icon={ArrowDownRight}
          tone="amber"
          label={labels.monthWd}
          value={data ? fmtUsdtFromWei(data.teamMonthWithdrawWei || '0') : '—'}
          sub={labels.subWd}
          loading={loading}
          onClick={() => setDetail('monthWd')}
        />
      </div>

      {detail && data && (
        <PeriodModal
          kind={detail}
          data={data}
          chainId={chainId}
          localeKey={localeKey}
          dayLabel={dayLabel}
          weekLabel={weekLabel}
          monthLabel={monthLabel}
          labels={labels}
          t={t}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

function PeriodCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  loading,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  tone: 'cyan' | 'amber' | 'purple' | 'green' | 'rose'
  label: string
  value: string
  sub: string
  loading: boolean
  onClick: () => void
}) {
  const ring = {
    cyan: 'border-[#00f5d430] hover:border-[#00f5d460]',
    amber: 'border-[#f59e0b35] hover:border-[#f59e0b60]',
    purple: 'border-[#8b5cf635] hover:border-[#8b5cf660]',
    green: 'border-[#22c55e35] hover:border-[#22c55e55]',
    rose: 'border-[#f43f5e30] hover:border-[#f43f5e55]',
  }[tone]
  const iconBg = {
    cyan: 'bg-[#00f5d414] text-[#00f5d4]',
    amber: 'bg-[#f59e0b14] text-[#f59e0b]',
    purple: 'bg-[#8b5cf614] text-[#a78bfa]',
    green: 'bg-[#22c55e14] text-[#22c55e]',
    rose: 'bg-[#f43f5e14] text-[#fb7185]',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`rounded-2xl border bg-[#0d0d14] p-3.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 ${ring} disabled:opacity-60`}
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[9px] font-medium uppercase tracking-wide text-[#475569]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-base font-bold leading-tight text-[#f1f5f9]">
        {loading ? '…' : value}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] text-[#475569]">{sub}</p>
    </button>
  )
}

function PeriodModal({
  kind,
  data,
  chainId,
  localeKey,
  dayLabel,
  weekLabel,
  monthLabel,
  labels,
  t,
  onClose,
}: {
  kind: Exclude<DetailKind, null>
  data: RefNetOverviewData
  chainId: number
  localeKey: string
  dayLabel: string
  weekLabel: string
  monthLabel: string
  labels: Labels
  t: (k: string) => string
  onClose: () => void
}) {
  const { title, period, rows, isWd } = useMemo(() => {
    switch (kind) {
      case 'todayStake':
        return {
          title: labels.todayStake,
          period: `${labels.utcNote} ${dayLabel}`,
          rows: data.teamStakesToday || [],
          isWd: false,
        }
      case 'todayWd':
        return {
          title: labels.todayWd,
          period: `${labels.utcNote} ${dayLabel}`,
          rows: data.teamWithdrawsToday || [],
          isWd: true,
        }
      case 'weekStake':
        return {
          title: labels.weekStake,
          period: `${labels.periodWeek} ${weekLabel}`,
          rows: data.teamStakesWeek || [],
          isWd: false,
        }
      case 'weekWd':
        return {
          title: labels.weekWd,
          period: `${labels.periodWeek} ${weekLabel}`,
          rows: data.teamWithdrawsWeek || [],
          isWd: true,
        }
      case 'monthStake':
        return {
          title: labels.monthStake,
          period: `${labels.periodMonth} ${monthLabel} UTC`,
          rows: data.teamStakesMonth || [],
          isWd: false,
        }
      case 'monthWd':
        return {
          title: labels.monthWd,
          period: `${labels.periodMonth} ${monthLabel} UTC`,
          rows: data.teamWithdrawsMonth || [],
          isWd: true,
        }
      default:
        return { title: '', period: '', rows: [] as RefNetOverviewEventRow[], isWd: false }
    }
  }, [kind, data, labels, dayLabel, weekLabel, monthLabel])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-[#00f5d430] bg-gradient-to-b from-[#13131e] to-[#0d0d14] shadow-[0_0_60px_rgba(0,245,212,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-4 py-3">
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#f1f5f9]">{title}</h3>
            <p className="text-[10px] text-[#64748b]">{period}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#64748b] hover:bg-[#1a1a2e] hover:text-[#f1f5f9]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {isWd && <p className="mb-2 text-[10px] text-[#64748b]">{labels.mixedWd || t('nodes.refNetMixedWithdrawNote')}</p>}
          <RefNetEventsTable rows={rows} showWho chainId={chainId} localeKey={localeKey} t={t} />
        </div>
      </div>
    </div>
  )
}
