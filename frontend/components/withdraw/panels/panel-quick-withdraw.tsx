'use client'

import { Zap, ArrowLeft, TrendingUp, Briefcase, Users, Gift, Coins } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useReferralWithdraw } from '@/hooks/useReferralWithdraw'
import { TransactionOverlay } from '../transaction-overlay'

interface Props {
  onMobileBack: () => void
  data: any
}

export function PanelQuickWithdraw({ onMobileBack, data }: Props) {
  const { isConnected } = useAccount()
  const [withdrawType, setWithdrawType] = useState<'rwa' | 'usdt'>('rwa')
  const { withdrawFlexibleRWAPrincipal, withdrawFlexibleUSDTPrincipal, withdrawRWARewards, withdrawDividend, withdrawStRWA } = useStakingContract()
  const { withdraw: withdrawReferral } = useReferralWithdraw()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // 计算可提取金额
  const rwaPrincipal = parseFloat(data.rwaPrincipal || '0')
  const usdtPrincipal = parseFloat(data.usdtPrincipal || '0')
  const rwaYield = parseFloat(data.yieldAmount || '0')
  const referral = parseFloat(data.referralAmount || '0')
  const dividend = parseFloat(data.dividendAmount || '0')
  const strwa = parseFloat(data.strwaAmount || '0')

  const totalRWA = rwaPrincipal + rwaYield + strwa
  const totalUSDT = usdtPrincipal + referral + dividend

  const hasRWA = totalRWA > 0
  const hasUSDT = totalUSDT > 0

  const handleQuickWithdraw = async () => {
    if (withdrawType === 'rwa' && !hasRWA) {
      alert('暂无可提取的 RWA')
      return
    }
    if (withdrawType === 'usdt' && !hasUSDT) {
      alert('暂无可提取的 USDT')
      return
    }

    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)

    try {
      const hashes: string[] = []

      if (withdrawType === 'rwa') {
        // 提取 RWA 本金
        if (rwaPrincipal > 0) {
          const hash = await withdrawFlexibleRWAPrincipal(rwaPrincipal.toString())
          hashes.push(hash)
        }
        // 提取 RWA 收益
        if (rwaYield > 0) {
          const hash = await withdrawRWARewards(rwaYield.toString(), false)
          hashes.push(hash)
        }
        // 兑换 stRWA
        if (strwa > 0) {
          const hash = await withdrawStRWA(strwa.toString())
          hashes.push(hash)
        }
      } else {
        // 提取 USDT 本金
        if (usdtPrincipal > 0) {
          const hash = await withdrawFlexibleUSDTPrincipal(usdtPrincipal.toString())
          hashes.push(hash)
        }
        // 提取推荐奖励
        if (referral > 0) {
          const hash = await withdrawReferral(referral.toString())
          hashes.push(hash)
        }
        // 提取项目分红
        if (dividend > 0) {
          const hash = await withdrawDividend(dividend.toString())
          hashes.push(hash)
        }
      }

      setTxHash(hashes[0])
      setOverlayStatus('success')
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#0a0a0f]" />
          </div>
          <div>
            <h2 className="text-[16px] font-[700] text-[#f1f5f9]">一键提取</h2>
            <p className="text-[12px] text-[rgba(238,242,255,0.52)] mt-0.5">快速提取所有资产</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 币种选择 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWithdrawType('rwa')}
              className={`group relative overflow-hidden px-5 py-6 rounded-2xl border transition-all duration-300 ${
                withdrawType === 'rwa'
                  ? 'bg-gradient-to-br from-[rgba(251,191,36,0.12)] to-[rgba(245,158,11,0.08)] border-[rgba(251,191,36,0.3)] shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                  : 'bg-[#13131e] border-[rgba(255,255,255,0.06)] hover:border-[rgba(251,191,36,0.15)]'
              }`}
            >
              <div className="relative z-10 text-center">
                <div className="text-[13px] font-[600] text-[#fbbf24] mb-2">提取 RWA</div>
                <div className="text-[24px] font-[700] text-[#f1f5f9] mb-1" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {totalRWA.toFixed(2)}
                </div>
                <div className="text-[11px] text-[rgba(238,242,255,0.52)]">
                  ≈ ${(totalRWA * 0.85).toFixed(2)}
                </div>
              </div>
            </button>

            <button
              onClick={() => setWithdrawType('usdt')}
              className={`group relative overflow-hidden px-5 py-6 rounded-2xl border transition-all duration-300 ${
                withdrawType === 'usdt'
                  ? 'bg-gradient-to-br from-[rgba(251,191,36,0.12)] to-[rgba(245,158,11,0.08)] border-[rgba(251,191,36,0.3)] shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                  : 'bg-[#13131e] border-[rgba(255,255,255,0.06)] hover:border-[rgba(251,191,36,0.15)]'
              }`}
            >
              <div className="relative z-10 text-center">
                <div className="text-[13px] font-[600] text-[#fbbf24] mb-2">提取 USDT</div>
                <div className="text-[24px] font-[700] text-[#f1f5f9] mb-1" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {totalUSDT.toFixed(2)}
                </div>
                <div className="text-[11px] text-[rgba(238,242,255,0.52)]">
                  ≈ ${totalUSDT.toFixed(2)}
                </div>
              </div>
            </button>
          </div>

          {/* 明细卡片 */}
          <div className="bg-[#13131e] rounded-2xl p-5 border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[600] text-[rgba(238,242,255,0.7)] mb-4">提取明细</h3>
            <div className="space-y-3">
              {withdrawType === 'rwa' ? (
                <>
                  {rwaPrincipal > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">质押本金</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {rwaPrincipal.toFixed(2)} RWA
                      </span>
                    </div>
                  )}
                  {rwaYield > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">RWA 收益</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {rwaYield.toFixed(2)} RWA
                      </span>
                    </div>
                  )}
                  {strwa > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">stRWA 兑换</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {strwa.toFixed(2)} stRWA
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {usdtPrincipal > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">质押本金</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {usdtPrincipal.toFixed(2)} USDT
                      </span>
                    </div>
                  )}
                  {referral > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">推荐奖励</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {referral.toFixed(2)} USDT
                      </span>
                    </div>
                  )}
                  {dividend > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-[#00ffc8]" />
                        <span className="text-[13px] text-[rgba(238,242,255,0.7)]">项目分红</span>
                      </div>
                      <span className="text-[14px] font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {dividend.toFixed(2)} USDT
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 一键提取按钮 */}
          <button
            onClick={handleQuickWithdraw}
            disabled={!isConnected || loading || (withdrawType === 'rwa' ? !hasRWA : !hasUSDT)}
            className="w-full h-[54px] rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0f] text-[15px] font-[700] flex items-center justify-center gap-2.5 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            <Zap className="w-5 h-5" />
            {loading ? '处理中...' : `一键提取 ${withdrawType === 'rwa' ? 'RWA' : 'USDT'}`}
          </button>
        </div>
      </div>

      <TransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        amount={(withdrawType === 'rwa' ? totalRWA : totalUSDT).toString()}
        withdrawType={withdrawType}
        error={error}
        onClose={() => setShowOverlay(false)}
      />
    </div>
  )
}
