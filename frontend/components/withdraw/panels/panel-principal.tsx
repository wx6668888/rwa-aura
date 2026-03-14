'use client'

import { Briefcase, ArrowLeft, Clock, Info } from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { useState } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { TransactionOverlay } from '../transaction-overlay'
import { LockedStakesList } from '../locked-stakes-list'

interface Props {
  onMobileBack: () => void
  data: any
}

export function PanelPrincipal({ onMobileBack, data }: Props) {
  const { isConnected } = useAccount()
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
    <div className="flex flex-col h-full bg-[#0a0a0f]/40">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-6 border-b border-emerald-500/10">
        <button
          onClick={onMobileBack}
          className="lg:hidden flex items-center gap-2 text-white/50 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5">
            <div className="w-full h-full bg-[#0a0a0f] rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">质押本金</h2>
            <p className="text-xs text-white/40 mt-0.5">灵活质押，随时提取</p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-sm font-semibold text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {data.loading ? '...' : isConnected ? `${data.rwaPrincipal} RWA` : '--'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {hasRWA || hasUSDT ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Enhanced 币种选择 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setWithdrawType('rwa')}
                disabled={!hasRWA}
                className={`relative overflow-hidden px-6 py-5 rounded-2xl border transition-all ${
                  withdrawType === 'rwa'
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                } ${!hasRWA ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {withdrawType === 'rwa' && hasRWA && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 animate-pulse" />
                )}
                <div className="relative z-10">
                  <div className="text-sm font-semibold text-emerald-400 mb-2">RWA 本金</div>
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
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                } ${!hasUSDT ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {withdrawType === 'usdt' && hasUSDT && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 animate-pulse" />
                )}
                <div className="relative z-10">
                  <div className="text-sm font-semibold text-emerald-400 mb-2">USDT 本金</div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {data.usdtPrincipal}
                  </div>
                </div>
              </button>
            </div>

            {/* Enhanced 提取金额输入 */}
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-semibold text-white/70">提取金额</label>
                <button
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                  onClick={() => setAmount(withdrawType === 'rwa' ? data.rwaPrincipal : data.usdtPrincipal)}
                >
                  MAX
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              />
              <div className="mt-4 flex items-start gap-2 text-xs text-white/50">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div>扣除 8% 手续费，最低提取 100 {withdrawType === 'rwa' ? 'RWA' : 'USDT'}</div>
                  {amount && parseFloat(amount) >= 100 && (
                    <div className="mt-1 text-emerald-400 font-semibold">
                      实际到账: {(parseFloat(amount) * 0.92).toFixed(2)} {withdrawType === 'rwa' ? 'RWA' : 'USDT'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced 提取按钮 */}
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !amount || parseFloat(amount) < 100 || loading || (!hasRWA && !hasUSDT)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-base font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              <Briefcase className="w-5 h-5" />
              {loading ? '处理中...' : '提取质押本金'}
            </button>

            {/* 锁仓订单 */}
            {isConnected && data.lockedStakes && data.lockedStakes.length > 0 && (
              <LockedStakesList stakes={data.lockedStakes} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-4">
              <Briefcase className="w-10 h-10 text-[rgba(238,242,255,0.26)]" />
            </div>
            <div className="text-[rgba(238,242,255,0.52)] text-[14px]">暂无质押本金</div>
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
