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

      setTxHash(hash)
      
      // Wait for transaction confirmation
      const receipt = await publicClient?.waitForTransactionReceipt({ hash: hash as `0x${string}` })
      
      if (receipt?.status === 'success') {
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
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[rgba(0,255,200,0.1)]">
        <button
          onClick={onMobileBack}
          className="lg:hidden flex items-center gap-2 text-[rgba(238,242,255,0.52)] hover:text-[#00ffc8] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px]">返回</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#0a0a0f]" />
          </div>
          <div>
            <h2 className="text-[16px] font-[700] text-[#f1f5f9]">质押本金</h2>
            <p className="text-[12px] text-[rgba(238,242,255,0.52)] mt-0.5">灵活锁仓，随时可提取</p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-full bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)]">
          <span className="text-[13px] font-[600] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {data.loading ? '...' : isConnected ? `${data.rwaPrincipal} RWA` : '--'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {hasRWA || hasUSDT ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* 币种选择 */}
            <div className="grid grid-cols-2 gap-3">
              {hasRWA && (
                <button
                  onClick={() => setWithdrawType('rwa')}
                  className={`group relative overflow-hidden px-5 py-4 rounded-2xl border transition-all duration-300 ${
                    withdrawType === 'rwa'
                      ? 'bg-gradient-to-br from-[rgba(0,255,200,0.12)] to-[rgba(0,212,170,0.08)] border-[rgba(0,255,200,0.3)] shadow-[0_0_20px_rgba(0,255,200,0.15)]'
                      : 'bg-[#13131e] border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,255,200,0.15)]'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="text-[13px] font-[600] text-[#00ffc8] mb-1">RWA 本金</div>
                    <div className="text-[18px] font-[700] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {data.rwaPrincipal}
                    </div>
                  </div>
                  {withdrawType === 'rwa' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,255,200,0.05)] to-transparent opacity-50" />
                  )}
                </button>
              )}
              {hasUSDT && (
                <button
                  onClick={() => setWithdrawType('usdt')}
                  className={`group relative overflow-hidden px-5 py-4 rounded-2xl border transition-all duration-300 ${
                    withdrawType === 'usdt'
                      ? 'bg-gradient-to-br from-[rgba(0,255,200,0.12)] to-[rgba(0,212,170,0.08)] border-[rgba(0,255,200,0.3)] shadow-[0_0_20px_rgba(0,255,200,0.15)]'
                      : 'bg-[#13131e] border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,255,200,0.15)]'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="text-[13px] font-[600] text-[#00ffc8] mb-1">USDT 本金</div>
                    <div className="text-[18px] font-[700] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {data.usdtPrincipal}
                    </div>
                  </div>
                  {withdrawType === 'usdt' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,255,200,0.05)] to-transparent opacity-50" />
                  )}
                </button>
              )}
            </div>

            {/* 提取金额输入 */}
            <div className="bg-[#13131e] rounded-2xl p-5 border border-[rgba(255,255,255,0.06)]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[13px] font-[600] text-[rgba(238,242,255,0.7)]">
                  提取金额
                </label>
                <button
                  className="px-3 py-1.5 rounded-full bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.2)] text-[11px] font-[600] text-[#00ffc8] hover:bg-[rgba(0,255,200,0.15)] transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
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
                className="w-full bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[16px] font-[600] text-[#f1f5f9] placeholder:text-[rgba(238,242,255,0.26)] focus:outline-none focus:border-[rgba(0,255,200,0.3)] transition"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              />
              <div className="mt-3 flex items-start gap-2 text-[11px] text-[rgba(238,242,255,0.52)]">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <div>扣除 8% 手续费，最低提取 100 {withdrawType === 'rwa' ? 'RWA' : 'USDT'}</div>
                  {amount && parseFloat(amount) >= 100 && (
                    <div className="mt-1 text-[#00ffc8]">
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
              className="w-full h-[54px] rounded-2xl bg-gradient-to-r from-[#00ffc8] to-[#00d4aa] text-[#0a0a0f] text-[15px] font-[700] flex items-center justify-center gap-2.5 hover:shadow-[0_0_30px_rgba(0,255,200,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
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
