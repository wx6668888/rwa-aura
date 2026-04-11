'use client'

import { Users, ArrowLeft, Info } from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'
import { useReferralWithdraw } from '@/hooks/useReferralWithdraw'
import { TransactionOverlay } from '../transaction-overlay'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { emitDataRefresh } from '@/lib/data-refresh'
import { useLocale } from '@/components/locale-provider'

interface Props {
  onMobileBack: () => void
  data: any
  embedded?: boolean
}

export function PanelReferral({ onMobileBack, data, embedded = false }: Props) {
  const { locale } = useLocale()
  const isZh = locale.startsWith('zh')
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const [amount, setAmount] = useState('')
  const { withdraw } = useReferralWithdraw()
  const { nextSettlement, totalPending } = useReferralRewards()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  const referralAmount = parseFloat(data.referralAmount || '0')
  const hasReferral = referralAmount > 0
  const pendingWithdrawAmount = Number.isFinite(referralAmount) ? referralAmount : 0
  const pendingSettleAmount = Number.isFinite(totalPending) ? totalPending : 0
  const cardMainAmount = hasReferral ? pendingWithdrawAmount : pendingSettleAmount
  const cardMainLabel = hasReferral ? (isZh ? '可提取金额' : 'Withdrawable') : (isZh ? '待结算金额' : 'Pending settlement')

  const nextSettlementMs = useMemo(() => {
    if (!nextSettlement) return null
    const t = Date.parse(nextSettlement)
    return Number.isFinite(t) ? t : null
  }, [nextSettlement])

  useEffect(() => {
    if (!nextSettlementMs) return
    const tick = () => {
      const now = Date.now()
      const diff = Math.max(0, nextSettlementMs - now)
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown({ days, hours, minutes, seconds })
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [nextSettlementMs])

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 100) {
      alert(isZh ? '最低提现 100 USDT' : 'Minimum withdrawal is 100 USDT')
      return
    }

    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)

    try {
      const hash = await withdraw(amount)
      setTxHash(hash)
      setOverlayStatus('pending')
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
      }
      // 提现成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
      void fetch(`/api/ingest/tx/${hash}`, { method: 'POST' }).catch((e) =>
        console.error('[ingest] referral tx failed to trigger:', e)
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
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">{isZh ? '推荐奖励' : 'Referral Rewards'}</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[220px]">
              {isZh ? '邀请好友，赚取佣金 · 每周结算' : 'Invite friends, earn commissions · Weekly settlement'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6">
            {/* 下次发放倒计时 + 待提取金额（与其他卡片风格一致） */}
            <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-[#00f5d440] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#fbbf24]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/20 rounded-full blur-3xl opacity-40" />
              <div className="relative z-10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#fbbf24]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#fbbf24]">{isZh ? '下次发放' : 'Next settlement'}</div>
                      <div className="text-[10px] text-white/40">{isZh ? '每周一 02:00 结算' : 'Settled every Monday 02:00'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">{cardMainLabel}</div>
                    <div className="text-base font-bold text-[#00f5d4]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {cardMainAmount.toFixed(2)} USDT
                    </div>
                    <div className="text-[10px] text-white/35 mt-0.5">
                      {(isZh ? '待结算' : 'Pending')}: {pendingSettleAmount.toFixed(2)} USDT
                    </div>
                  </div>
                </div>

                {/* 倒计时 */}
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
                  placeholder="100"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pr-16 py-4 text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/40 transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#00f5d41a] border border-[#00f5d433] text-[11px] font-semibold text-[#00f5d4] hover:bg-[#00f5d426] transition"
                  onClick={() => setAmount(pendingWithdrawAmount.toString())}
                >
                  MAX
                </button>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-[#94a3b8]">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>{isZh ? '扣除 8% 手续费，最低提取 100 USDT' : '8% fee deducted, minimum withdrawal 100 USDT'}</div>
                  {amount && parseFloat(amount) >= 100 && (
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
              disabled={!isConnected || !amount || parseFloat(amount) < 100 || loading || !hasReferral}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0f] text-base font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Users className="w-5 h-5" />
              {loading ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '提取推荐奖励' : 'Withdraw Referral Rewards')}
            </button>
            {!hasReferral && (
              <div className="text-center text-[13px] text-[rgba(238,242,255,0.52)]">
                {pendingSettleAmount > 0
                  ? (isZh ? '当前奖励待结算中，结算后才可提取' : 'Rewards are pending settlement and can be withdrawn after settlement')
                  : (isZh ? '当前暂无推荐奖励' : 'No referral rewards available')}
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
