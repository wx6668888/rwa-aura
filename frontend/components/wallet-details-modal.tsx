'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, X, ArrowUpRight, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useAccount, useChainId, useDisconnect } from 'wagmi'
import { getWalletAssetRows } from '@/lib/swap-tokens'
import { useWalletUsdtEstimate } from '@/hooks/use-wallet-usdt-estimate'
import { useTokenTransferHistory } from '@/hooks/use-token-transfer-history'
import { TokenIcon } from '@/components/swap/token-icon'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

type TabKey = 'network' | 'assets' | 'history'

function dateLocaleTag(locale: string) {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'ko') return 'ko-KR'
  if (locale === 'ja') return 'ja-JP'
  if (locale === 'ar') return 'ar'
  return 'en-US'
}

type Props = {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  onOpenChainModal?: () => void
}

function shortAddr(v?: string) {
  if (!v) return '--'
  return `${v.slice(0, 6)}...${v.slice(-4)}`
}

export function WalletDetailsModal({ open, isOpen, onClose, onOpenChainModal }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const modalOpen = Boolean(open ?? isOpen)
  const chainId = useChainId()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [tab, setTab] = useState<TabKey>('assets')
  const [copied, setCopied] = useState(false)
  const [viewportH, setViewportH] = useState<number>(760)

  const rows = useMemo(() => getWalletAssetRows(chainId), [chainId])

  const { totalUsdt, isLoading: estimateLoading, balancesMap } = useWalletUsdtEstimate(
    address as `0x${string}` | undefined,
    rows,
    modalOpen && isConnected
  )

  const rwaRow = rows.find((r) => r.symbol === 'RWA' && r.balanceTarget !== 'native')
  const transfers = useTokenTransferHistory(
    (rwaRow?.balanceTarget as `0x${string}` | undefined) ?? undefined,
    (address as `0x${string}` | undefined) ?? undefined,
    rwaRow?.decimals ?? 18,
    20,
    modalOpen && tab === 'history' && isConnected
  )

  useEffect(() => {
    if (!modalOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [modalOpen, onClose])

  useEffect(() => {
    if (!modalOpen) setTab('assets')
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const calc = () => {
      const vv = window.visualViewport?.height
      const inner = window.innerHeight
      const h = Math.floor((Number.isFinite(vv) ? Number(vv) : inner) || inner || 760)
      setViewportH(Math.max(520, h))
    }
    calc()
    window.addEventListener('resize', calc)
    window.visualViewport?.addEventListener('resize', calc)
    return () => {
      window.removeEventListener('resize', calc)
      window.visualViewport?.removeEventListener('resize', calc)
    }
  }, [modalOpen])

  if (!modalOpen || !isConnected || !address) return null

  // Android wallet WebView (e.g. Honor/TP/Binance) may misreport vh/dvh.
  // Use real visual viewport height for stable bottom-sheet sizing.
  const mobileMaxH = tab === 'network' ? Math.floor(viewportH * 0.58) : Math.floor(viewportH * 0.84)
  const modalHeight = `${Math.max(tab === 'network' ? 360 : 460, mobileMaxH)}px`

  const assetRows = rows.map((r) => {
    // 直接从已经查询成功的 balancesMap 中获取余额
    const amount = balancesMap[r.symbol] || '0'
    return { ...r, amount }
  })

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // noop
    }
  }

  return (
    <div
      data-wallet-details-modal="1"
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative z-[141] flex w-full max-w-[420px] flex-col self-end overflow-hidden rounded-t-3xl border border-[#00f5d420] bg-gradient-to-b from-[#0d0d14] via-[#0a0a10] to-[#0d0d14] shadow-[0_-12px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,245,212,0.06)_inset] transition-[height,max-height] duration-300 ease-out sm:rounded-3xl sm:h-[min(75dvh,75vh)] sm:max-h-[min(75dvh,75vh)]"
        style={{ height: modalHeight, maxHeight: modalHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶栏：与仪表盘卡片一致的强调线 + 标题 */}
        <div className="relative shrink-0 border-b border-[#00f5d420]/15 px-5 py-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5d4]/35 to-transparent"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-plasma-cyan to-plasma-cyan/20" aria-hidden />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-plasma-cyan/75">
                  {t('wallet.overviewKicker')}
                </div>
                <div className="mt-0.5 text-[17px] font-bold tracking-tight text-text-primary">{t('wallet.overviewTitle')}</div>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full p-2 text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
              onClick={onClose}
              aria-label={t('wallet.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 地址 + 总资产：玻璃质感摘要卡 */}
        <div className="shrink-0 border-b border-[#00f5d420]/10 px-5 py-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#00f5d420]/20 bg-gradient-to-br from-[#12121a]/95 to-[#0c0c12]/95 p-4 shadow-[0_0_40px_rgba(0,245,212,0.06)]">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-plasma-cyan/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/90">
                  {t('wallet.currentAddress')}
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-bold text-text-primary">{shortAddr(address)}</span>
                  {copied ? (
                    <span className="rounded-full bg-plasma-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-plasma-cyan ring-1 ring-plasma-cyan/25">
                      {t('wallet.copied')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/90">
                  {t('wallet.totalUsdtLabel')}
                </span>
                <div className="mt-1.5 bg-gradient-to-r from-plasma-cyan to-emerald-300/90 bg-clip-text text-[20px] font-bold tabular-nums text-transparent">
                  ${estimateLoading || totalUsdt == null ? '--' : totalUsdt.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab：与 Swap 工具条类似的槽式分段 */}
        <div className="shrink-0 border-b border-[#00f5d420]/10 px-4 py-3">
          <div
            className="flex w-full items-center gap-0.5 rounded-full bg-[#0a0a10] p-1 ring-1 ring-white/[0.06]"
            role="tablist"
            aria-label={t('wallet.overviewSectionsAria')}
          >
            {(['network', 'assets', 'history'] as TabKey[]).map((k) => {
              const on = tab === k
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(k)}
                  className={`relative min-h-[34px] min-w-0 flex-1 rounded-full px-3 py-2 text-center text-[11px] font-bold transition-all sm:text-xs ${
                    on
                      ? 'bg-[#1c1c28] text-plasma-cyan shadow-[inset_0_0_0_1px_rgba(0,245,212,0.22)]'
                      : 'text-[#64748b] hover:text-[#cbd5e1]'
                  }`}
                >
                  {k === 'network' ? t('wallet.tabNetwork') : k === 'assets' ? t('wallet.tabAssets') : t('wallet.tabHistory')}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#05050a]/35 p-4 [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]">
          {tab === 'network' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#00f5d420]/15 bg-[#0d0d14]/80 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  {t('wallet.currentNetwork')}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-text-primary">{t('wallet.network')}</span>
                  <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-text-secondary ring-1 ring-white/[0.06]">
                    {chainId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenChainModal}
                className="w-full rounded-2xl bg-plasma-cyan py-3 text-sm font-bold text-void-black shadow-[0_10px_30px_rgba(0,245,212,0.18)] transition-[transform,filter] hover:brightness-110 active:scale-[0.99]"
              >
                {t('wallet.switchNetwork')}
              </button>
            </div>
          )}

          {tab === 'assets' && (
            <div className="space-y-2">
              {assetRows.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between rounded-2xl border border-[#00f5d420]/12 bg-gradient-to-r from-[#0d0d14]/90 to-[#13131e]/60 px-4 py-3 transition-colors hover:border-[#00f5d420]/25 hover:bg-[#13131e]/80"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={r.symbol} iconUrl={r.iconUrl} accent={r.accent} sizeClass="h-9 w-9 text-[10px]" />
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-text-primary">{r.symbol}</div>
                      <div className="truncate text-[13px] text-text-secondary">{r.name}</div>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2 text-right font-mono text-[14px] font-semibold tabular-nums text-text-primary">
                    {Number(r.amount).toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {transfers.loading ? (
                <div className="rounded-2xl border border-[#00f5d420]/10 bg-[#0d0d14]/50 px-4 py-3 text-xs text-text-secondary">
                  {t('wallet.historyLoading')}
                </div>
              ) : null}
              {!transfers.loading && transfers.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#00f5d420]/20 bg-[#0d0d14]/35 px-4 py-6 text-center text-xs text-text-secondary">
                  {t('wallet.historyEmpty')}
                </div>
              ) : null}
              {transfers.items.map((it) => (
                <div
                  key={`${it.txHash}-${it.logIndex}`}
                  className="flex items-center justify-between rounded-2xl border border-[#00f5d420]/12 bg-gradient-to-r from-[#0d0d14]/90 to-[#13131e]/60 p-3 transition-colors hover:border-[#00f5d420]/22"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-white/[0.06] ${
                        it.direction === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {it.direction === 'in' ? <ArrowUpRight className="h-4 w-4 rotate-180" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-text-primary">
                        {it.direction === 'in' ? t('wallet.receiveRwa') : t('wallet.sendRwa')}
                      </span>
                      <span className="text-[12px] text-text-secondary">
                        {it.timestampMs
                          ? new Date(it.timestampMs).toLocaleString(dateLocaleTag(locale), {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end pl-2">
                    <span
                      className={`font-mono text-[15px] font-bold tabular-nums ${
                        it.direction === 'in' ? 'text-emerald-400' : 'text-text-primary'
                      }`}
                    >
                      {it.direction === 'in' ? '+' : '-'}
                      {Number(transfers.formatAmount(it.value)).toFixed(2)}
                    </span>
                    <a
                      href={it.direction === 'in' ? `https://bscscan.com/address/${it.from}` : `https://bscscan.com/address/${it.to}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex max-w-[10rem] items-center gap-1 truncate text-[11px] text-text-secondary transition-colors hover:text-plasma-cyan"
                    >
                      {it.direction === 'in'
                        ? t('wallet.transferFrom', { addr: shortAddr(it.from) })
                        : t('wallet.transferTo', { addr: shortAddr(it.to) })}{' '}
                      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-80" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[#00f5d420]/12 bg-[#05050a]/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-[13px] font-semibold text-text-primary transition-colors hover:bg-white/[0.07]"
          >
            <Copy className="h-4 w-4 shrink-0 text-plasma-cyan/90" /> {t('wallet.copy')}
          </button>
          <button
            type="button"
            onClick={() => {
              disconnect()
              onClose()
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-[13px] font-semibold text-text-primary transition-colors hover:bg-white/[0.07]"
            aria-label={t('wallet.disconnect')}
            title={t('wallet.disconnect')}
          >
            <LogOut className="h-4 w-4 shrink-0 text-plasma-cyan/90" />
            <span className="hidden sm:inline">{t('wallet.disconnect')}</span>
            <span className="inline sm:hidden">{t('wallet.disconnectShort')}</span>
          </button>
          <Link
            href="/swap"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-plasma-cyan py-3 text-[13px] font-bold text-void-black shadow-[0_10px_26px_rgba(0,245,212,0.16)] transition-[filter] hover:brightness-110"
          >
            {t('wallet.buy')}
          </Link>
        </div>
      </div>
    </div>
  )
}
