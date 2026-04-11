'use client'

import { Gift, ArrowLeft, Info } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import { useTeamDividend } from '@/hooks/useTeamDividend'
import { TransactionOverlay } from '../transaction-overlay'
import { emitDataRefresh } from '@/lib/data-refresh'
import { useLocale } from '@/components/locale-provider'

interface Props {
  onMobileBack: () => void
  data: any
  embedded?: boolean
}

// 计算到下个月1号0点的倒计时
function getNextDividendCountdown() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0)
  const diff = nextMonth.getTime() - now.getTime()
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return { days, hours, minutes, seconds }
}

export function PanelDividend({ onMobileBack, data, embedded = false }: Props) {
  const { locale } = useLocale()
  const isZh = locale.startsWith('zh')
  const { isConnected, address } = useAccount()
  const [amount, setAmount] = useState('')
  const { withdraw: withdrawDividend } = useTeamDividend()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(getNextDividendCountdown())

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getNextDividendCountdown())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const dividendAmount = parseFloat(data.dividendAmount || '0')
  const hasDividend = dividendAmount > 0

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert(isZh ? '请输入有效金额' : 'Please enter a valid amount')
      return
    }

    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)

    try {
      const hash = await withdrawDividend(amount)
      setTxHash(hash)
      // 提现成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
      void fetch(`/api/ingest/tx/${hash}`, { method: 'POST' }).catch((e) =>
        console.error('[ingest] dividend tx failed to trigger:', e)
      )
      emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
      setOverlayStatus('success')
      setAmount('')
    } catch (err: any) {
      console.error('提取失败:', err)
      
      let errorMessage = isZh ? '提取失败，请重试' : 'Withdrawal failed, please try again'
      if (err.message?.includes('User rejected') || err.message?.includes('User denied')) {
        errorMessage = isZh ? '您已取消交易' : 'You cancelled the transaction'
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = isZh ? 'BNB 余额不足，无法支付 Gas 费用' : 'Insufficient BNB for gas fee'
      } else if (err.message?.includes('execution reverted')) {
        errorMessage = isZh ? '合约执行失败，请检查提取金额' : 'Contract execution failed, please check withdrawal amount'
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
            <span className="text-sm">{isZh ? '返回' : 'Back'}</span>
          </button>
          <div className="min-w-0 ml-auto text-right">
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">{isZh ? '项目分红' : 'Project Dividend'}</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[220px]">
              {isZh ? '每月结算分红 · USDT 发放' : 'Monthly dividend settlement · paid in USDT'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6">
            {/* 倒计时卡片 */}
            <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-[#00f5d440] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#fbbf24]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/20 rounded-full blur-3xl opacity-40" />
              <div className="relative z-10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/10 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-[#fbbf24]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#fbbf24]">{isZh ? '下次发放' : 'Next settlement'}</div>
                      <div className="text-[10px] text-white/40">{isZh ? '每月 1号 00:00 结算' : 'Settled on the 1st 00:00 monthly'}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {String(countdown.days).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-white/40">{isZh ? '天' : 'D'}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {String(countdown.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-white/40">{isZh ? '小时' : 'H'}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {String(countdown.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-white/40">{isZh ? '分钟' : 'M'}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-white/40">{isZh ? '秒' : 'S'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]">
              <div className="relative z-10 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#fbbf24]">{isZh ? '当前可提取' : 'Currently withdrawable'}</div>
                  <div className="text-base font-bold text-[#00f5d4]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {Number.isFinite(dividendAmount) ? dividendAmount.toFixed(2) : '0.00'} USDT
                  </div>
                </div>
              </div>
            </div>
            {/* 金额卡片：玻璃风格 */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-white/70">{isZh ? '提取金额' : 'Withdrawal Amount'}</label>
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
                  onClick={() => setAmount(data.dividendAmount)}
                >
                  MAX
                </button>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-[#94a3b8]">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>{isZh ? '扣除 8% 手续费' : '8% fee deducted'}</div>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="mt-1 text-[#22c55e] font-semibold">
                      {isZh ? '实际到账' : 'Net received'}: {(parseFloat(amount) * 0.92).toFixed(2)} USDT
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 主操作按钮：金色 */}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !amount || parseFloat(amount) <= 0 || loading || !hasDividend}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0f] text-base font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Gift className="w-5 h-5" />
              {loading ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '提取项目分红' : 'Withdraw Dividend')}
            </button>
            {!hasDividend && (
              <div className="text-center text-[13px] text-[rgba(238,242,255,0.52)]">
                {isZh ? '当前暂无可提取项目分红' : 'No project dividend available'}
              </div>
            )}
          </div>
      </div>

      <TransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        amount={amount}
        withdrawType="usdt"
        error={error}
        onClose={() => setShowOverlay(false)}
      />
    </div>
  )
}
