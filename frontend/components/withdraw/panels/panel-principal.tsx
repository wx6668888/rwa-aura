'use client'

import { Briefcase, ArrowLeft, Clock, Info } from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { useState } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { TransactionOverlay } from '../transaction-overlay'
import { LockedStakesList } from '../locked-stakes-list'
import { pollDashboardUntilTxIndexed } from '@/lib/dashboard-index-poll'
import { emitDataRefresh } from '@/lib/data-refresh'

interface Props {
  onMobileBack: () => void
  data: any
  embedded?: boolean
}

export function PanelPrincipal({ onMobileBack, data, embedded = false }: Props) {
  const { isConnected, address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [amount, setAmount] = useState('')
  const { withdrawFlexibleUSDTPrincipal, withdrawFlexibleRWAPrincipal } = useStakingContract()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [withdrawType, setWithdrawType] = useState<'rwa' | 'usdt'>('rwa')

  const rwaPrincipal = parseFloat(data.rwaPrincipal || '0')
  const usdtPrincipal = parseFloat(data.usdtPrincipal || '0')
  const hasRWA = rwaPrincipal > 0
  const hasUSDT = usdtPrincipal > 0

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 100) {
      alert('最低提取 100')
      return
    }

    setLoading(true)
    setError(null)
    setShowOverlay(true)
    setOverlayStatus('waiting')

    try {
      let hash
      if (withdrawType === 'rwa') {
        hash = await withdrawFlexibleRWAPrincipal(amount)
      } else {
        hash = await withdrawFlexibleUSDTPrincipal(amount)
      }
      
      // Wait for transaction confirmation
      const receipt = await publicClient?.waitForTransactionReceipt({ hash: hash as `0x${string}` })
      
      if (receipt?.status === 'success') {
        setTxHash(hash)
        setOverlayStatus('success')
        setAmount('')
        emitDataRefresh({ kind: 'withdraw', txHash: hash as `0x${string}`, address })
        // 提现成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
        void fetch(`/api/ingest/tx/${hash}`, { method: 'POST' }).catch((e) =>
          console.error('[ingest] principal tx failed to trigger:', e)
        )

        // 非阻塞：轮询 GET，等待后端把该 txHash 写入历史记录（最多 3 分钟）
        if (address && chainId) {
          void pollDashboardUntilTxIndexed({
            userAddress: address,
            chainId,
            txHash: hash as `0x${string}`,
            kind: 'withdraw',
          }).catch(() => {})
        }

        if (data.refetch) data.refetch()
      } else {
        throw new Error('交易执行失败，可能是余额不足或权限不足')
      }
    } catch (err: any) {
      console.error('提取失败:', err)
      
      // 友好的错误提示
      let errorMessage = '提取失败，请重试'
      
      if (err.message?.includes('User rejected') || err.message?.includes('User denied')) {
        errorMessage = '您已取消交易'
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'BNB 余额不足，无法支付 Gas 费用'
      } else if (err.message?.includes('execution reverted')) {
        errorMessage = '合约执行失败，请检查提取金额'
      }
      
      setError(errorMessage)
      setOverlayStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {!embedded ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <button
            onClick={onMobileBack}
            className="lg:hidden flex items-center gap-2 text-white/50 hover:text-[#00f5d4] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
          <div className="min-w-0 ml-auto text-right">
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">质押本金</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[220px]">
              支持 RWA / USDT 灵活本金快速提取
            </p>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {hasRWA || hasUSDT ? (
          <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6">
            {/* 币种选择 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setWithdrawType('rwa')}
                disabled={!hasRWA}
                className={`relative overflow-hidden px-6 py-5 rounded-2xl border transition-all ${
                  withdrawType === 'rwa'
                    ? 'bg-[#022c22] border-[#00f5d450] shadow-lg shadow-[rgba(0,245,212,0.25)]'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                } ${!hasRWA ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {withdrawType === 'rwa' && hasRWA && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d433] to-[#22c55e26] animate-pulse" />
                )}
                <div className="relative z-10">
                  <div className="text-sm font-semibold text-[#00f5d4] mb-2">RWA 本金</div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {data.rwaPrincipal}
                  </div>
                </div>
              </button>
              <button
                onClick={() => setWithdrawType('usdt')}
                disabled={!hasUSDT}
                className={`relative overflow-hidden px-6 py-5 rounded-2xl border transition-all ${
                  withdrawType === 'usdt'
                    ? 'bg-[#022c22] border-[#00f5d450] shadow-lg shadow-[rgba(0,245,212,0.25)]'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                } ${!hasUSDT ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {withdrawType === 'usdt' && hasUSDT && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d433] to-[#22c55e26] animate-pulse" />
                )}
                <div className="relative z-10">
                  <div className="text-sm font-semibold text-[#00f5d4] mb-2">USDT 本金</div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {data.usdtPrincipal}
                  </div>
                </div>
              </button>
            </div>

            {/* 提取金额输入：玻璃卡（MAX 按钮内嵌） */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-white/70">提取金额</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pr-16 py-4 text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/40 transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#00f5d41a] border border-[#00f5d433] text-[11px] font-semibold text-[#00f5d4] hover:bg-[#00f5d426] transition"
                  onClick={() => setAmount(withdrawType === 'rwa' ? data.rwaPrincipal : data.usdtPrincipal)}
                >
                  MAX
                </button>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-[#94a3b8]">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>扣除 8% 手续费，最低提取 100 {withdrawType === 'rwa' ? 'RWA' : 'USDT'}</div>
                  {amount && parseFloat(amount) >= 100 && (
                    <div className="mt-1 text-[#22c55e] font-semibold">
                      实际到账: {(parseFloat(amount) * 0.92).toFixed(2)} {withdrawType === 'rwa' ? 'RWA' : 'USDT'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 提取按钮 */}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !amount || parseFloat(amount) < 100 || loading || (!hasRWA && !hasUSDT)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0f] text-base font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Briefcase className="w-5 h-5" />
              {loading ? '处理中...' : '提取质押本金'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-4">
              <Briefcase className="w-10 h-10 text-[rgba(238,242,255,0.26)]" />
            </div>
            <div className="text-[rgba(238,242,255,0.52)] text-[14px]">暂无质押本金</div>
          </div>
        )}

        {/* 锁仓订单倒计时：独立于灵活本金，有锁仓数据就显示（避免只显示在「有灵活本金」分支导致不显示） */}
        {isConnected && data.lockedStakes && data.lockedStakes.length > 0 && (
          <div className="max-w-[640px] mx-auto px-4 pb-6 pt-2">
            <LockedStakesList stakes={data.lockedStakes} />
          </div>
        )}
      </div>

      <TransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        amount={amount}
        withdrawType={withdrawType}
        error={error}
        onClose={() => setShowOverlay(false)}
      />
    </div>
  )
}
