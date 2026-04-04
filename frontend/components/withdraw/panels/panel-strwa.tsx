'use client'

import { Coins, ArrowLeft, Info } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { TransactionOverlay } from '../transaction-overlay'

interface Props {
  onMobileBack: () => void
  data: any
  embedded?: boolean
}

export function PanelStRWA({ onMobileBack, data, embedded = false }: Props) {
  const { isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const { withdrawStRWA } = useStakingContract()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const strwaAmount = parseFloat(data.strwaAmount || '0')
  const hasStrwa = strwaAmount > 0

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效金额')
      return
    }

    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)

    try {
      const hash = await withdrawStRWA(amount)
      setTxHash(hash)
      // 提现成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
      void fetch(`/api/ingest/tx/${hash}`, { method: 'POST' }).catch((e) =>
        console.error('[ingest] stRWA tx failed to trigger:', e)
      )
      setOverlayStatus('success')
      setAmount('')
    } catch (err: any) {
      console.error('提取失败:', err)
      
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
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">stRWA 凭证</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[220px]">
              质押凭证 · 无手续费 1:1 兑换 RWA
            </p>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {hasStrwa ? (
          <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6">
            {/* 数量卡片：玻璃风格 */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-white/70">兑换数量</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pr-16 py-4 text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/40 transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#00f5d41a] border border-[#00f5d433] text-[11px] font-semibold text-[#00f5d4] hover:bg-[#00f5d426] transition"
                  onClick={() => setAmount(data.strwaAmount)}
                >
                  MAX
                </button>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-[#94a3b8]">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>无手续费，1:1 兑换为 RWA</div>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="mt-1 text-[#22c55e] font-semibold">
                      到账: {parseFloat(amount).toFixed(2)} RWA
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 主操作按钮：金色 */}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !amount || parseFloat(amount) <= 0 || loading || !hasStrwa}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0f] text-base font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Coins className="w-5 h-5" />
              {loading ? '处理中...' : '兑换 stRWA'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-4">
              <Coins className="w-10 h-10 text-[rgba(238,242,255,0.26)]" />
            </div>
            <div className="text-[rgba(238,242,255,0.52)] text-[14px]">暂无 stRWA 凭证</div>
          </div>
        )}
      </div>

      <TransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        amount={amount}
        withdrawType="rwa"
        error={error}
        onClose={() => setShowOverlay(false)}
      />
    </div>
  )
}
