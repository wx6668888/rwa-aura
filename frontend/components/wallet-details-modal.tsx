'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, X, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useAccount, useChainId, useDisconnect } from 'wagmi'
import { getWalletAssetRows } from '@/lib/swap-tokens'
import { useWalletUsdtEstimate, type WalletBalancesMap } from '@/hooks/use-wallet-usdt-estimate'
import { useTokenTransferHistory } from '@/hooks/use-token-transfer-history'

type TabKey = 'network' | 'assets' | 'history'

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
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative z-[141] flex w-full max-w-[420px] flex-col self-end overflow-hidden rounded-t-3xl border border-[#27262c] bg-[#111318]/95 shadow-[0_-12px_60px_rgba(0,0,0,0.55)] transition-[height,max-height] duration-300 ease-out sm:rounded-3xl sm:h-[min(75dvh,75vh)] sm:max-h-[min(75dvh,75vh)]"
        style={{ height: modalHeight, maxHeight: modalHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#27262c] px-5 py-4">
          <div className="text-[17px] font-bold text-[#f4eeff]">钱包总览</div>
          <button className="rounded-md p-1 text-[#94a3b8] hover:bg-[#1a2230]" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#27262c] px-5 py-4 bg-[#181a20]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-[#111318] p-4 rounded-2xl border border-[#262c38]">
              <div className="flex flex-col">
                <span className="text-xs text-[#7a859a] mb-1">当前地址</span>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#f4eeff]">{shortAddr(address)}</span>
                  {copied ? <span className="text-[10px] bg-[#00f5d4]/20 text-[#00f5d4] px-1.5 py-0.5 rounded">已复制</span> : null}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-[#7a859a] mb-1">总资产 (USDT)</span>
                <span className="text-[18px] font-bold text-[#00f5d4]">
                  ${estimateLoading || totalUsdt == null ? '--' : totalUsdt.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[#27262c] p-3 bg-[#111318]">
          {(['network', 'assets', 'history'] as TabKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-xs ${tab === k ? 'bg-[#1a2633] text-[#00f5d4]' : 'text-[#94a3b8] hover:bg-[#151d29]'}`}
            >
              {k === 'network' ? '网络' : k === 'assets' ? '资产' : '历史'}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]">
          {tab === 'network' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#223043] bg-[#111826] p-3">
                <div className="text-xs text-[#64748b]">当前网络</div>
                <div className="mt-1 text-sm font-semibold text-[#e2e8f0]">BSC ({chainId})</div>
              </div>
              <button
                type="button"
                onClick={onOpenChainModal}
                className="rounded-full bg-[#00f5d4] px-4 py-2 text-sm font-semibold text-[#051018]"
              >
                切换网络
              </button>
            </div>
          )}

          {tab === 'assets' && (
            <div className="space-y-2">
              {assetRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded-2xl border border-[#262c38] bg-[#1a1f2c] px-4 py-3 hover:bg-[#202634] transition-colors">
                  <div className="flex items-center gap-3">
                    {r.iconUrl ? (
                      <img src={r.iconUrl} alt={r.symbol} className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${r.accent} flex items-center justify-center text-[10px] font-bold text-white shadow-inner`}>{r.symbol.slice(0, 3)}</div>
                    )}
                    <div>
                      <div className="text-[15px] font-semibold text-[#e2e8f0]">{r.symbol}</div>
                      <div className="text-[13px] text-[#64748b]">{r.name}</div>
                    </div>
                  </div>
                  <div className="text-[15px] font-medium text-[#e2e8f0]">{Number(r.amount).toFixed(4)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {transfers.loading ? <div className="text-xs text-[#64748b]">加载中...</div> : null}
              {!transfers.loading && transfers.items.length === 0 ? <div className="text-xs text-[#64748b]">暂无记录</div> : null}
              {transfers.items.map((it) => (
                <div key={`${it.txHash}-${it.logIndex}`} className="rounded-2xl border border-[#262c38] bg-[#1a1f2c] p-3 hover:bg-[#202634] transition-colors flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${it.direction === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {it.direction === 'in' ? <ArrowUpRight className="h-4 w-4 rotate-180" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-[#e2e8f0]">{it.direction === 'in' ? '接收 RWA' : '发送 RWA'}</span>
                      <span className="text-[12px] text-[#64748b]">{it.timestampMs ? new Date(it.timestampMs).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '--'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[15px] font-bold ${it.direction === 'in' ? 'text-emerald-400' : 'text-[#e2e8f0]'}`}>{it.direction === 'in' ? '+' : '-'}{Number(transfers.formatAmount(it.value)).toFixed(2)}</span>
                    <a href={it.direction === 'in' ? `https://bscscan.com/address/${it.from}` : `https://bscscan.com/address/${it.to}`} target="_blank" rel="noreferrer" className="text-[12px] text-[#7a859a] hover:text-[#00f5d4] flex items-center gap-1 mt-0.5 transition-colors">
                      {it.direction === 'in' ? `来自 ${shortAddr(it.from)}` : `发至 ${shortAddr(it.to)}`} <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#27262c] p-4 bg-[#111318] flex gap-3">
          <button type="button" onClick={onCopy} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#202634] py-3 text-[14px] font-semibold text-[#f4eeff] hover:bg-[#2a3143] transition-colors">
            <Copy className="h-4 w-4" /> 复制
          </button>
          <Link href="/swap" onClick={onClose} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00f5d4] py-3 text-[14px] font-semibold text-[#051018] hover:brightness-110 transition-[filter]">
             买币
          </Link>
          <button
            type="button"
            onClick={() => {
              disconnect()
              onClose()
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 py-3 text-[14px] font-semibold text-rose-500 hover:bg-rose-500/20 transition-colors"
            aria-label="断开连接"
            title="断开连接"
          >
            <span className="hidden sm:inline">断开连接</span>
            <span className="inline sm:hidden">断开</span>
          </button>
        </div>
      </div>
    </div>
  )
}
