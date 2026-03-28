'use client'

import { Zap, ArrowLeft, TrendingUp, Briefcase, Users, Gift, Coins } from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { useState } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useReferralWithdraw } from '@/hooks/useReferralWithdraw'
import { TransactionOverlay } from '../transaction-overlay'
import { emitDataRefresh } from '@/lib/data-refresh'

interface Props {
  onMobileBack: () => void
  data: any
  /** 嵌入 Cyber 底栏时隐藏顶栏，避免与上方摘要重复 */
  embedded?: boolean
}

export function PanelQuickWithdraw({ onMobileBack, data, embedded = false }: Props) {
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
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
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
        }
        // 提取 RWA 收益
        if (rwaYield > 0) {
          const hash = await withdrawRWARewards(rwaYield.toString(), false)
          hashes.push(hash)
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
        }
        // 兑换 stRWA
        if (strwa > 0) {
          const hash = await withdrawStRWA(strwa.toString())
          hashes.push(hash)
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
        }
      } else {
        // 提取 USDT 本金
        if (usdtPrincipal > 0) {
          const hash = await withdrawFlexibleUSDTPrincipal(usdtPrincipal.toString())
          hashes.push(hash)
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
        }
        // 提取推荐奖励
        if (referral > 0) {
          const hash = await withdrawReferral(referral.toString())
          hashes.push(hash)
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
        }
        // 提取项目分红
        if (dividend > 0) {
          const hash = await withdrawDividend(dividend.toString())
          hashes.push(hash)
          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
          emitDataRefresh({ kind: 'withdraw', txHash: hash, address })
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
    <div className="flex h-full flex-col bg-[#020617]/40">
      {!embedded ? (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
          <button
            onClick={onMobileBack}
            className="lg:hidden flex items-center gap-2 text-[rgba(238,242,255,0.5)] hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
          <div className="min-w-0 ml-auto text-right">
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">一键提取</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[210px]">
              聚合多种资产，一次签名完成提取
            </p>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 py-6 space-y-5">
          {/* 币种选择：主操作切换 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setWithdrawType('rwa')}
              className={`relative overflow-hidden px-6 py-8 rounded-2xl border transition-all duration-300 ${
                withdrawType === 'rwa'
                  ? 'bg-white/[0.06] backdrop-blur-xl border-[#00f5d450] shadow-lg shadow-[rgba(0,245,212,0.25)]'
                  : 'bg-white/[0.02] backdrop-blur-xl border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.15]'
              }`}
            >
              {withdrawType === 'rwa' && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d433] to-[#22c55e26] animate-pulse" />
              )}
              <div className="relative z-10 text-center">
                <div className="text-sm font-semibold text-[#00f5d4] mb-3">提取 RWA</div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {totalRWA.toFixed(2)}
                </div>
                <div className="text-xs text-white/40">
                  ≈ ${(totalRWA * 0.85).toFixed(2)} USDT
                </div>
              </div>
            </button>

            <button
              onClick={() => setWithdrawType('usdt')}
              className={`relative overflow-hidden px-6 py-8 rounded-2xl border transition-all duration-300 ${
                withdrawType === 'usdt'
                  ? 'bg-white/[0.06] backdrop-blur-xl border-[#00f5d450] shadow-lg shadow-[rgba(0,245,212,0.25)]'
                  : 'bg-white/[0.02] backdrop-blur-xl border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.15]'
              }`}
            >
              {withdrawType === 'usdt' && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d433] to-[#22c55e26] animate-pulse" />
              )}
              <div className="relative z-10 text-center">
                <div className="text-sm font-semibold text-[#00f5d4] mb-3">提取 USDT</div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {totalUSDT.toFixed(2)}
                </div>
                <div className="text-xs text-white/40">
                  ≈ ${totalUSDT.toFixed(2)} USDT
                </div>
              </div>
            </button>
          </div>

          {/* 明细 + 结构：玻璃主卡 */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06] shadow-[0_0_25px_rgba(15,23,42,0.6)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-full" />
                资产拆分
              </h3>
              <span className="text-[10px] text-slate-400">
                一键提取会自动按下列顺序聚合执行
              </span>
            </div>
            <div className="space-y-3">
              {withdrawType === 'rwa' ? (
                <>
                  {rwaPrincipal > 0 && (
                    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00f5d41a] flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-[#00f5d4]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">质押本金</span>
                          <span className="text-[11px] text-slate-400">RWA 灵活 / 到期锁仓本金</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white font-mono block">
                          {rwaPrincipal.toFixed(2)} RWA
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ≈ {(rwaPrincipal * 0.85).toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  )}
                  {rwaYield > 0 && (
                    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00f5d41a] flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-[#00f5d4]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">RWA 收益</span>
                          <span className="text-[11px] text-slate-400">已结算，可立即提取或兑换 stRWA</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white font-mono block">
                          {rwaYield.toFixed(2)} RWA
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ≈ {(rwaYield * 0.85).toFixed(2)} USDT
                        </span>
                      </div>
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
                    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#00f5d41a] flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-[#00f5d4]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-[rgba(238,242,255,0.9)] truncate">质押本金</span>
                          <span className="text-[11px] text-slate-400">USDT 灵活 / 到期锁仓本金</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[14px] font-[600] text-[#f1f5f9] font-mono block">
                          {usdtPrincipal.toFixed(2)} USDT
                        </span>
                      </div>
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

          <p className="text-[10px] text-slate-500 text-center">
            系统将按上方顺序依次执行多笔提取操作，失败时只会回退未成功部分，已到账资产不会回滚。
          </p>
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
