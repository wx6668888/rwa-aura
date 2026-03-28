'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { X, RefreshCw, Loader2, ExternalLink, TrendingUp, ArrowDownRight, Users, Wallet, BarChart3 } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import {
  useReferralNetworkOverview,
  type RefNetOverviewData,
  type RefNetOverviewEventRow,
} from '@/hooks/useReferralNetworkOverview'

type DetailKind =
  | 'teamStakeToday'
  | 'teamWdToday'
  | 'teamVolume'
  | 'teamRetained'
  | 'myStakeToday'
  | 'myWdToday'
  | 'allMyStakes'
  | 'allMyWithdraws'
  | null

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

function shortAddr(a: string) {
  if (!a || a.length < 12) return a || '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function bscTxUrl(chainId: number, hash: string) {
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`
  if (chainId === 97) return `https://testnet.bscscan.com/tx/${hash}`
  return `https://bscscan.com/tx/${hash}`
}

export function ReferralNetworkTeamOverview() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { data, loading, error, refresh } = useReferralNetworkOverview()
  const [spin, setSpin] = useState(false)
  const [detail, setDetail] = useState<DetailKind>(null)

  const localeKey =
    locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US'

  const onRefresh = useCallback(async () => {
    setSpin(true)
    await refresh()
    setTimeout(() => setSpin(false), 800)
  }, [refresh])

  if (!isConnected) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-base font-bold text-[#f1f5f9]">
            {t('nodes.refNetOvSection')}
          </h2>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[#64748b]">{t('nodes.refNetOvSubtitle')}</p>
          {data && (
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#00f5d4]/90">
              {t('nodes.refNetOvMeta', {
                direct: String(data.directReferrals),
                n: String(data.teamDownlineCount ?? 0),
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#00f5d430] bg-[#00f5d410] px-3 py-1.5 text-[12px] font-medium text-[#00f5d4] transition-colors hover:bg-[#00f5d420] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${spin || loading ? 'animate-spin' : ''}`} />
          {t('nodes.refNetRefresh')}
        </button>
      </div>

      {error && (
        <p className="mb-3 text-[12px] text-[#f43f5e]">{t('nodes.refNetLoadOverviewFailed')}: {error}</p>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <OvCard
          icon={TrendingUp}
          tone="cyan"
          label={t('nodes.refNetCardTeamStakeToday')}
          value={data ? fmtUsdtFromWei(data.teamTodayStakeUsdtEqWei) : '—'}
          sub="USDT ≈"
          loading={loading}
          onClick={() => setDetail('teamStakeToday')}
        />
        <OvCard
          icon={ArrowDownRight}
          tone="amber"
          label={t('nodes.refNetCardTeamWdToday')}
          value={data ? fmtUsdtFromWei(data.teamTodayWithdrawWei) : '—'}
          sub="wei · mixed"
          loading={loading}
          onClick={() => setDetail('teamWdToday')}
        />
        <OvCard
          icon={BarChart3}
          tone="purple"
          label={t('nodes.refNetCardTeamVolume')}
          value={data ? fmtUsdtFromWei(data.teamVolumeWei) : '—'}
          sub="USDT ≈"
          loading={loading}
          onClick={() => setDetail('teamVolume')}
        />
        <OvCard
          icon={Users}
          tone="green"
          label={t('nodes.refNetCardTeamRetained')}
          value={data ? fmtUsdtFromWei(data.teamRetainedWei) : '—'}
          sub="USDT ≈"
          loading={loading}
          onClick={() => setDetail('teamRetained')}
        />
        <OvCard
          icon={Wallet}
          tone="cyan"
          label={t('nodes.refNetCardMyStakeToday')}
          value={data ? fmtUsdtFromWei(data.myTodayStakeUsdtEqWei) : '—'}
          sub="USDT ≈"
          loading={loading}
          onClick={() => setDetail('myStakeToday')}
        />
        <OvCard
          icon={ArrowDownRight}
          tone="rose"
          label={t('nodes.refNetCardMyWdToday')}
          value={data ? fmtUsdtFromWei(data.myTodayWithdrawWei) : '—'}
          sub="wei"
          loading={loading}
          onClick={() => setDetail('myWdToday')}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDetail('allMyStakes')}
          className="rounded-full border border-[#ffffff14] px-3 py-1.5 text-[11px] text-[#94a3b8] transition-colors hover:border-[#00f5d440] hover:text-[#00f5d4]"
        >
          {t('nodes.refNetAllMyStakes')}
        </button>
        <button
          type="button"
          onClick={() => setDetail('allMyWithdraws')}
          className="rounded-full border border-[#ffffff14] px-3 py-1.5 text-[11px] text-[#94a3b8] transition-colors hover:border-[#00f5d440] hover:text-[#00f5d4]"
        >
          {t('nodes.refNetAllMyWithdraws')}
        </button>
      </div>

      {detail && address && (
        <>
          {(detail === 'allMyStakes' || detail === 'allMyWithdraws') && !data ? (
            <HistoryOnlyModal
              kind={detail}
              address={address}
              chainId={chainId}
              localeKey={localeKey}
              t={t}
              onClose={() => setDetail(null)}
            />
          ) : data ? (
            <OverviewDetailModal
              kind={detail}
              data={data}
              me={address.toLowerCase()}
              chainId={chainId}
              localeKey={localeKey}
              t={t}
              onClose={() => setDetail(null)}
            />
          ) : null}
        </>
      )}
    </section>
  )
}

function OvCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
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
      className={`rounded-2xl border bg-[#0d0d14] p-3.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 ${ring} inset-shadow-sm disabled:opacity-60`}
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[9px] font-medium uppercase tracking-wide text-[#475569]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold leading-tight text-[#f1f5f9]">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#64748b]" /> : value}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] text-[#475569]">{sub}</p>
    </button>
  )
}

function OverviewDetailModal({
  kind,
  data,
  me,
  chainId,
  localeKey,
  t,
  onClose,
}: {
  kind: Exclude<DetailKind, null>
  data: RefNetOverviewData
  me: string
  chainId: number
  localeKey: string
  t: (k: string) => string
  onClose: () => void
}) {
  const title = useMemo(() => {
    const m: Record<string, string> = {
      teamStakeToday: t('nodes.refNetCardTeamStakeToday'),
      teamWdToday: t('nodes.refNetCardTeamWdToday'),
      teamVolume: t('nodes.refNetCardTeamVolume'),
      teamRetained: t('nodes.refNetCardTeamRetained'),
      myStakeToday: t('nodes.refNetCardMyStakeToday'),
      myWdToday: t('nodes.refNetCardMyWdToday'),
      allMyStakes: t('nodes.refNetAllMyStakes'),
      allMyWithdraws: t('nodes.refNetAllMyWithdraws'),
    }
    return m[kind] || ''
  }, [kind, t])

  const dayLabel = new Date(data.dayStart * 1000).toLocaleDateString(localeKey, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#00f5d430] bg-gradient-to-b from-[#13131e] to-[#0d0d14] shadow-[0_0_60px_rgba(0,245,212,0.15)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-4 py-3">
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#f1f5f9]">{title}</h3>
            {(kind === 'teamStakeToday' ||
              kind === 'teamWdToday' ||
              kind === 'myStakeToday' ||
              kind === 'myWdToday') && (
              <p className="text-[10px] text-[#64748b]">
                UTC {dayLabel} · {t('nodes.refNetTapDetail')}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#64748b] hover:bg-[#1a1a2e] hover:text-[#f1f5f9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {kind === 'teamStakeToday' && (
            <RefNetEventsTable
              rows={data.teamStakesToday.map((r) => ({
                ...r,
                userAddress: r.userAddress,
              }))}
              showWho
              chainId={chainId}
              localeKey={localeKey}
              t={t}
            />
          )}
          {kind === 'teamWdToday' && (
            <div>
              <p className="mb-2 text-[10px] text-[#64748b]">{t('nodes.refNetMixedWithdrawNote')}</p>
              <RefNetEventsTable rows={data.teamWithdrawsToday} showWho chainId={chainId} localeKey={localeKey} t={t} />
            </div>
          )}
          {kind === 'myStakeToday' && (
            <RefNetEventsTable
              rows={data.myStakesToday.map((r) => ({ ...r, userAddress: me }))}
              showWho={false}
              chainId={chainId}
              localeKey={localeKey}
              t={t}
            />
          )}
          {kind === 'myWdToday' && (
            <div>
              <p className="mb-2 text-[10px] text-[#64748b]">{t('nodes.refNetMixedWithdrawNote')}</p>
              <RefNetEventsTable
                rows={data.myWithdrawsToday.map((r) => ({ ...r, userAddress: me }))}
                showWho={false}
                chainId={chainId}
                localeKey={localeKey}
                t={t}
              />
            </div>
          )}
          {kind === 'teamVolume' && (
            <div className="space-y-3 text-[12px]">
              <p className="text-[#94a3b8] leading-relaxed">{t('nodes.refNetExplainVolume')}</p>
              <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-3 font-[family-name:var(--font-jetbrains-mono)] text-[#00f5d4]">
                {fmtUsdtFromWei(data.teamVolumeWei)} USDT ≈
              </div>
              <p className="text-[11px] font-semibold text-[#f1f5f9]">{t('nodes.refNetMemberBreakdown')}</p>
              <p className="text-[10px] text-[#64748b]">{t('nodes.refNetMemberBreakdownNote')}</p>
              <MemberTable data={data} me={me} t={t} />
            </div>
          )}
          {kind === 'teamRetained' && (
            <div className="space-y-3 text-[12px]">
              <p className="text-[#94a3b8] leading-relaxed">{t('nodes.refNetExplainRetained')}</p>
              <div className="grid gap-2">
                <RowKV label={t('nodes.refNetCardTeamVolume')} value={`${fmtUsdtFromWei(data.teamVolumeWei)} USDT ≈`} />
                <RowKV
                  label={t('nodes.refNetTotalWithdrawnLabel')}
                  value={`${fmtUsdtFromWei(data.teamWithdrawnTotalWei)} (wei)`}
                />
                <RowKV label={t('nodes.refNetCardTeamRetained')} value={`${fmtUsdtFromWei(data.teamRetainedWei)} USDT ≈`} />
              </div>
            </div>
          )}
          {kind === 'allMyStakes' && <StakeHistoryBody address={me} chainId={chainId} localeKey={localeKey} t={t} />}
          {kind === 'allMyWithdraws' && <WithdrawHistoryBody address={me} chainId={chainId} localeKey={localeKey} t={t} />}
        </div>
      </div>
    </div>
  )
}

function HistoryOnlyModal({
  kind,
  address,
  chainId,
  localeKey,
  t,
  onClose,
}: {
  kind: 'allMyStakes' | 'allMyWithdraws'
  address: string
  chainId: number
  localeKey: string
  t: (k: string) => string
  onClose: () => void
}) {
  const title = kind === 'allMyStakes' ? t('nodes.refNetAllMyStakes') : t('nodes.refNetAllMyWithdraws')
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#00f5d430] bg-[#13131e] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-4 py-3">
          <h3 className="text-sm font-bold text-[#f1f5f9]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#64748b] hover:bg-[#1a1a2e]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3">
          {kind === 'allMyStakes' ? (
            <StakeHistoryBody address={address} chainId={chainId} localeKey={localeKey} t={t} />
          ) : (
            <WithdrawHistoryBody address={address} chainId={chainId} localeKey={localeKey} t={t} />
          )}
        </div>
      </div>
    </div>
  )
}

function RowKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg border border-[#ffffff0d] bg-[#0d0d14] px-3 py-2">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#e2e8f0]">{value}</span>
    </div>
  )
}

function MemberTable({ data, me, t }: { data: RefNetOverviewData; me: string; t: (k: string) => string }) {
  const sorted = [...data.memberBreakdown].sort((a, b) => {
    const da = BigInt(a.usdtEqWei)
    const db = BigInt(b.usdtEqWei)
    return da > db ? -1 : da < db ? 1 : 0
  })
  return (
    <div className="overflow-x-auto rounded-xl border border-[#ffffff0d]">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-[#ffffff0d] text-[#64748b]">
            <th className="px-2 py-2">{t('nodes.refNetColWho')}</th>
            <th className="px-2 py-2 text-end">{t('nodes.refNetColAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.userAddress} className="border-b border-[#ffffff08]">
              <td className="px-2 py-2 font-mono text-[#94a3b8]">
                {m.userAddress === me ? t('nodes.refNetYouLabel') : shortAddr(m.userAddress)}
              </td>
              <td className="px-2 py-2 text-end font-mono text-[#00f5d4]">{fmtUsdtFromWei(m.usdtEqWei)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RefNetEventsTable({
  rows,
  showWho,
  chainId,
  localeKey,
  t,
}: {
  rows: RefNetOverviewEventRow[]
  showWho: boolean
  chainId: number
  localeKey: string
  t: (k: string) => string
}) {
  if (!rows.length) {
    return <p className="py-8 text-center text-[13px] text-[#64748b]">{t('nodes.refNetEmpty')}</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[#ffffff0d]">
      <table className="w-full text-left text-[10px]">
        <thead>
          <tr className="border-b border-[#ffffff0d] text-[#64748b]">
            <th className="px-2 py-2">{t('nodes.refNetColWhen')}</th>
            {showWho && <th className="px-2 py-2">{t('nodes.refNetColWho')}</th>}
            <th className="px-2 py-2">{t('nodes.refNetColType')}</th>
            <th className="px-2 py-2 text-end">{t('nodes.refNetColAmount')}</th>
            <th className="w-8 px-1 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const ts = new Date(r.timestamp * 1000).toLocaleString(localeKey)
            const sym = String(r.eventType || '').toUpperCase().includes('RWA') ? 'RWA' : 'USDT'
            const amt = fmtAmount(r.amount, sym)
            return (
              <tr key={`${r.txHash}-${i}`} className="border-b border-[#ffffff08]">
                <td className="whitespace-nowrap px-2 py-2 font-mono text-[#94a3b8]">{ts}</td>
                {showWho && (
                  <td className="px-2 py-2 font-mono text-[#64748b]">{r.userAddress ? shortAddr(r.userAddress) : '—'}</td>
                )}
                <td className="max-w-[100px] truncate px-2 py-2 text-[#cbd5e1]" title={r.eventType}>
                  {r.eventType || '—'}
                </td>
                <td className="px-2 py-2 text-end font-mono text-[#f1f5f9]">{amt}</td>
                <td className="px-1 py-2">
                  {r.txHash ? (
                    <a
                      href={bscTxUrl(chainId, r.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-[#00f5d4] hover:opacity-80"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function fmtAmount(wei: string, sym: string) {
  try {
    const n = formatUnits(BigInt(wei || '0'), 18)
    const x = parseFloat(n)
    return `${x.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${sym}`
  } catch {
    return wei
  }
}

function StakeHistoryBody({
  address,
  chainId,
  localeKey,
  t,
}: {
  address: string
  chainId: number
  localeKey: string
  t: (k: string) => string
}) {
  const [rows, setRows] = useState<
    { amount: string; timestamp: number; eventType: string; txHash?: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/data/${address.toLowerCase()}/stake-list`)
        const json = await res.json()
        const list = (json.data || []) as {
          amount: string
          timestamp: number
          assetType?: string
          stakeId?: string
          blockNumber?: number
        }[]
        if (!cancel) {
          setRows(
            list.map((x) => ({
              amount: x.amount,
              timestamp: x.timestamp,
              eventType: x.assetType === 'RWA' ? 'RWA_STAKE' : 'USDT_STAKE',
              txHash: (x as { txHash?: string }).txHash,
            }))
          )
        }
      } catch {
        if (!cancel) setRows([])
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [address])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f5d4]" />
      </div>
    )
  }

  const evRows: RefNetOverviewEventRow[] = rows.map((r) => ({
    userAddress: address,
    eventType: r.eventType,
    amount: r.amount,
    timestamp: r.timestamp,
    txHash: r.txHash || '',
  }))

  return <RefNetEventsTable rows={evRows} showWho={false} chainId={chainId} localeKey={localeKey} t={t} />
}

function WithdrawHistoryBody({
  address,
  chainId,
  localeKey,
  t,
}: {
  address: string
  chainId: number
  localeKey: string
  t: (k: string) => string
}) {
  const [rows, setRows] = useState<RefNetOverviewEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/data/${address.toLowerCase()}/withdraw-list`)
        const json = await res.json()
        const list = (json.data || []) as {
          eventType: string
          amount: string
          timestamp: number
          txHash: string
        }[]
        if (!cancel) {
          setRows(
            list.map((x) => ({
              userAddress: address,
              eventType: x.eventType,
              amount: x.amount,
              timestamp: x.timestamp,
              txHash: x.txHash,
            }))
          )
        }
      } catch {
        if (!cancel) setRows([])
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [address])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f5d4]" />
      </div>
    )
  }

  return (
    <div>
      <p className="mb-2 text-[10px] text-[#64748b]">{t('nodes.refNetMixedWithdrawNote')}</p>
      <RefNetEventsTable rows={rows} showWho={false} chainId={chainId} localeKey={localeKey} t={t} />
    </div>
  )
}
