'use client'

import { Users, ArrowLeft, Info } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { useReferralWithdraw } from '@/hooks/useReferralWithdraw'
import { TransactionOverlay } from '../transaction-overlay'

interface Props {
  onMobileBack: () => void
  data: any
}

export function PanelReferral({ onMobileBack, data }: Props) {
  const { isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const { withdraw } = useReferralWithdraw()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const referralAmount = parseFloat(data.referralAmount || '0')
  const hasReferral = referralAmount > 0

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 100) {
      alert('最低提现 100 USDT')
      return
    }

    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)

    try {
      const hash = await withdraw(amount)
      setTxHash(hash)
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
    <div className="flex flex-col h-full bg-[#0a0a0f]/40">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-6 border-b border-orange-500/10">
        <button
          onClick={onMobileBack}
          className="lg:hidden flex items-center gap-2 text-white/50 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 p-0.5">
            <div className="w-full h-full bg-[#0a0a0f] rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">推荐奖励</h2>
            <p className="text-xs text-white/40 mt-0.5">邀请好友，赚取佣金</p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-sm font-semibold text-orange-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {data.loading ? '...' : isConnected ? `${data.referralAmount} USDT` : '--'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {hasReferral ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Enhanced 提取金额输入 */}
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-semibold text-white/70">提取金额</label>
                <button
                  className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition"
                  onClick={() => setAmount(data.referralAmount)}
                >
                  MAX
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/30 transition"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              />
              <div className="mt-4 flex items-start gap-2 text-xs text-white/50">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>扣除 8% 手续费，最低提取 100 USDT</div>
                  {amount && parseFloat(amount) >= 100 && (
                    <div className="mt-1 text-orange-400 font-semibold">
                      实际到账: {(parseFloat(amount) * 0.92).toFixed(2)} USDT
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced 提取按钮 */}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !amount || parseFloat(amount) < 100 || loading || !hasReferral}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-base font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Users className="w-5 h-5" />
              {loading ? '处理中...' : '提取推荐奖励'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-[rgba(238,242,255,0.26)]" />
            </div>
            <div className="text-[rgba(238,242,255,0.52)] text-[14px]">暂无推荐奖励</div>
          </div>
        )}
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
