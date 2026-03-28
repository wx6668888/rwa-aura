'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, X } from 'lucide-react'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useBalance, useChainId, useDisconnect, useReadContracts } from 'wagmi'
import { getWalletAssetRows } from '@/lib/swap-tokens'
import { useWalletUsdtEstimate } from '@/hooks/use-wallet-usdt-estimate'
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

  const rows = useMemo(() => getWalletAssetRows(chainId), [chainId])
  const tokenRows = rows.filter((r) => r.balanceTarget !== 'native')

  const nativeBalance = useBalance({
    address: modalOpen && isConnected ? address : undefined,
    query: { enabled: modalOpen && isConnected && !!address },
  })

  const contracts = useMemo(
    () =>
      modalOpen && isConnected && address
        ? tokenRows.map((r) => ({
            address: r.balanceTarget as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address],
          }))
        : [],
    [modalOpen, isConnected, address, tokenRows]
  )

  const erc20Balances = useReadContracts({
    contracts,
    query: { enabled: modalOpen && isConnected && contracts.length > 0 },
  })

  const { totalUsdt, isLoading: estimateLoading } = useWalletUsdtEstimate(
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

  if (!modalOpen || !isConnected || !address) return null

  const modalHeight = tab === 'network' ? 'min(50dvh, 50vh)' : 'min(75dvh, 75vh)'

  const assetRows = rows.map((r, i) => {
    let amount = '0'
    if (r.balanceTarget === 'native' && nativeBalance.data?.value != null) {
      amount = formatUnits(nativeBalance.data.value, r.decimals)
    } else if (r.balanceTarget !== 'native' && erc20Balances.data?.[i - 1]?.status === 'success') {
      const raw = erc20Balances.data[i - 1].result as bigint
      amount = formatUnits(raw, r.decimals)
    }
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
        className="relative z-[141] flex w-full max-w-2xl flex-col self-end overflow-hidden rounded-t-3xl border border-[#2a3342] bg-[#0e1119]/95 shadow-[0_-12px_60px_rgba(0,0,0,0.55)] transition-[height,max-height] duration-300 ease-out sm:rounded-3xl"
        style={{ height: modalHeight, maxHeight: modalHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1f2733] px-4 py-3">
          <div className="text-sm font-semibold text-[#e2e8f0]">钱包总览</div>
          <button className="rounded-md p-1 text-[#94a3b8] hover:bg-[#1a2230]" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#1f2733] px-4 py-3">
          <div className="text-xs text-[#64748b]">地址</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[#e2e8f0]">{shortAddr(address)}</span>
            <button type="button" onClick={onCopy} className="rounded-md p-1 text-[#94a3b8] hover:bg-[#1a2230]">
              <Copy className="h-3.5 w-3.5" />
            </button>
            {copied ? <span className="text-xs text-[#00f5d4]">已复制</span> : null}
          </div>
          <div className="mt-2 text-xs text-[#64748b]">
            总资产（USDT）:{' '}
            <span className="font-semibold text-[#e2e8f0]">
              {estimateLoading || totalUsdt == null ? '--' : totalUsdt.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[#1f2733] p-2">
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
                <div key={r.key} className="flex items-center justify-between rounded-xl border border-[#1f2733] bg-[#101722] px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-[#e2e8f0]">{r.symbol}</div>
                    <div className="text-xs text-[#64748b]">{r.name}</div>
                  </div>
                  <div className="text-sm text-[#cbd5e1]">{Number(r.amount).toFixed(4)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {transfers.loading ? <div className="text-xs text-[#64748b]">加载中...</div> : null}
              {!transfers.loading && transfers.items.length === 0 ? <div className="text-xs text-[#64748b]">暂无记录</div> : null}
              {transfers.items.map((it) => (
                <div key={`${it.txHash}-${it.logIndex}`} className="rounded-xl border border-[#1f2733] bg-[#101722] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${it.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {it.direction === 'in' ? '转入' : '转出'}
                    </span>
                    <span className="text-xs text-[#cbd5e1]">{Number(transfers.formatAmount(it.value)).toFixed(4)} RWA</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#64748b]">{shortAddr(it.txHash)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#1f2733] p-3">
          <button
            type="button"
            onClick={() => {
              disconnect()
              onClose()
            }}
            className="w-full rounded-full bg-[#182231] py-2 text-sm text-[#cbd5e1] hover:bg-[#202c3d]"
          >
            断开连接
          </button>
        </div>
      </div>
    </div>
  )
}
