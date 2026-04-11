'use client'

import { TrendingUp, ArrowLeft, Info, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import { useStakingContract } from '@/hooks/useStakingContract'
import { TransactionOverlay } from '../transaction-overlay'
import { useStakesContext } from '@/contexts/StakesContext'
import { pollDashboardUntilTxIndexed } from '@/lib/dashboard-index-poll'
import { useLocale } from '@/components/locale-provider'

interface Props {
  onMobileBack: () => void
  data: any
  embedded?: boolean
}

// 计算单个质押的未结算收益（USDT + RWA，与仪表盘逻辑保持一致）
function calculateUnsettledYield(stake: any, currentTime: number): number {
  const stakeTime = stake.timestamp
  const amount18 = parseFloat(stake.amount) // 18 位整数形式
  if (!amount18 || currentTime <= stakeTime) return 0
  const isRWAStake = stake.isRWAStake === true || (stake.stakeId && String(stake.stakeId).toUpperCase().startsWith('RWA_'))
  const amountToken = amount18 / 1e18 // 质押资产的“人类可读”数量（USDT 或 RWA）
  
  const last8AM = Math.floor(currentTime / 86400) * 86400
  const startTime = Math.max(stakeTime, last8AM)
  const duration = currentTime - startTime
  
  if (duration <= 0) return 0
  
  const baseRate = 0.008
  let lockBonus = 0
  if (stake.lockPeriod === '30') lockBonus = 0.3
  else if (stake.lockPeriod === '90') lockBonus = 0.6
  else if (stake.lockPeriod === '180') lockBonus = 1.0
  else if (stake.lockPeriod === '365') lockBonus = 1.5
  
  const dailyRate = baseRate * (1 + lockBonus)
  const secondRate = dailyRate / 86400

  // USDT 质押需要按 0.85 折算成 RWA 等值，再计算收益
  const rwaBaseAmount = isRWAStake ? amountToken : amountToken / 0.85

  return rwaBaseAmount * secondRate * duration
}

export function PanelRwaYield({ onMobileBack, data, embedded = false }: Props) {
  const { locale } = useLocale()
  const isZh = locale.startsWith('zh')
  const { isConnected, address, chainId } = useAccount()
  const [amount, setAmount] = useState('')
  const { withdrawRWARewards } = useStakingContract()
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [unsettledYield, setUnsettledYield] = useState(0)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const { stakes } = useStakesContext()

  const settledYield = parseFloat(data.yieldAmount || '0')
  const hasSettledYield = settledYield > 0

  useEffect(() => {
    const updateUnsettled = () => {
      const currentTime = Math.floor(Date.now() / 1000)
      // 与仪表盘一致：同时统计 USDT 质押和 RWA 质押的未结算收益
      const total = stakes.reduce((sum, stake) => {
        return sum + calculateUnsettledYield(stake, currentTime)
      }, 0)
      setUnsettledYield(total)
    }
    
    updateUnsettled()
    const timer = setInterval(updateUnsettled, 1000)
    return () => clearInterval(timer)
  }, [stakes])

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const bjTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
      let next = new Date(bjTime)
      next.setHours(8, 0, 0, 0)
      if (bjTime.getHours() >= 8) {
        next.setDate(next.getDate() + 1)
      }
      const diff = next.getTime() - bjTime.getTime()
      if (diff > 0) {
        setCountdown({
          hours: Math.floor(diff / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000)
        })
      }
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert(isZh ? '请输入有效金额' : 'Please enter a valid amount')
      return
    }
    if (parseFloat(amount) > settledYield) {
      alert(isZh ? '提取金额不能超过可提现收益' : 'Withdrawal amount cannot exceed withdrawable yield')
      return
    }
    setShowOverlay(true)
    setOverlayStatus('waiting')
    setError(null)
    setLoading(true)
    try {
      const hash = await withdrawRWARewards(amount, false)
      setTxHash(hash)
      // 提现成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
      void fetch(`/api/ingest/tx/${hash}`, { method: 'POST' }).catch((e) =>
        console.error('[ingest] rwa yield tx failed to trigger:', e)
      )
      setOverlayStatus('success')

      // 非阻塞：轮询 GET，等待后端把该 txHash 写入历史记录（最多 3 分钟）
      if (address && chainId) {
        void pollDashboardUntilTxIndexed({
          userAddress: address,
          chainId,
          txHash: hash as `0x${string}`,
          kind: 'withdraw',
        }).catch(() => {})
      }

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
          <button onClick={onMobileBack} className="lg:hidden flex items-center gap-2 text-white/50 hover:text-[#00f5d4] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{isZh ? '返回' : 'Back'}</span>
          </button>
          <div className="min-w-0 ml-auto text-right">
            <h2 className="text-[14px] font-semibold text-[#e2e8f0] tracking-tight truncate">{isZh ? 'RWA 收益' : 'RWA Yield'}</h2>
            <p className="text-[11px] text-[#64748b] mt-0.5 truncate max-w-[210px]">{isZh ? '实时预估 + 每日 08:00 结算' : 'Real-time estimate + settled daily at 08:00'}</p>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 py-6 space-y-4">
          {/* 未结算收益：玻璃卡 */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-[#00f5d440] transition-all duration-300">
            {/* 背景效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl opacity-50" />
            
            <div className="relative z-10 p-5">
              {/* 标题 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-yellow-400">{isZh ? '未结算收益' : 'Unsettled yield'}</div>
                    <div className="text-[10px] text-white/40">{isZh ? '实时计算中' : 'Real-time calculation'}</div>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-yellow-400/50 animate-pulse" />
              </div>

              {/* 金额 */}
              <div className="mb-3">
                <div className="text-2xl font-bold text-[#00f5d4] mb-1" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {unsettledYield.toFixed(6)} RWA
                </div>
                <div className="text-[10px] text-[#94a3b8]">{isZh ? '从上次 08:00 到现在，每秒实时累积' : 'Accumulated every second since last 08:00'}</div>
              </div>

              {/* 倒计时：数字和单位同一行显示 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-yellow-500/10">
                  <div
                    className="text-sm font-bold text-yellow-400 whitespace-nowrap text-center"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    {String(countdown.hours).padStart(2, '0')} {isZh ? '小时' : 'H'}
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-yellow-500/10">
                  <div
                    className="text-sm font-bold text-yellow-400 whitespace-nowrap text-center"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    {String(countdown.minutes).padStart(2, '0')} {isZh ? '分钟' : 'M'}
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-yellow-500/10">
                  <div
                    className="text-sm font-bold text-yellow-400 animate-pulse whitespace-nowrap text-center"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    {String(countdown.seconds).padStart(2, '0')} {isZh ? '秒' : 'S'}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 text-[10px] text-white/30">{isZh ? '距离下次发放（每日 08:00 北京时间）' : 'Until next payout (daily 08:00 UTC+8)'}</div>
            </div>
          </div>

          {/* 可提现收益：玻璃卡 */}
          {hasSettledYield ? (
            <>
              <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-[#22c55e50] transition-all duration-300">
                <div className="relative z-10 p-5">
                  {/* 标题 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#22c55e1a] flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#22c55e]">{isZh ? '可提现收益' : 'Withdrawable yield'}</div>
                        <div className="text-[10px] text-white/40">{isZh ? '已发放到合约' : 'Settled to contract'}</div>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  </div>

                  {/* 金额 */}
                  <div className="mb-2">
                    <div className="text-3xl font-bold text-[#22c55e]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {settledYield.toFixed(6)} RWA
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">{isZh ? '可随时提取到钱包' : 'Can be withdrawn to wallet anytime'}</div>
                  </div>
                </div>
              </div>
              
              {/* 提取表单 */}
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-semibold text-white/70">{isZh ? '提取金额' : 'Withdrawal Amount'}</label>
                  <button 
                    className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-semibold text-green-400 hover:bg-green-500/20 transition" 
                    onClick={() => setAmount(settledYield.toFixed(8))}
                  >
                    MAX
                  </button>
                </div>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-base font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/30 transition" 
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }} 
                />
                <div className="mt-3 flex items-start gap-2 text-[10px] text-white/50">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div>{isZh ? '扣除 8% 手续费' : '8% fee deducted'}</div>
                    {amount && parseFloat(amount) > 0 && (
                      <div className="mt-1 text-green-400 font-semibold">
                        {isZh ? '实际到账' : 'Net received'}: {(parseFloat(amount) * 0.92).toFixed(6)} RWA
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleWithdraw} 
                disabled={!isConnected || !amount || parseFloat(amount) <= 0 || loading || !hasSettledYield} 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
              >
                <TrendingUp className="w-4 h-4" />
                {loading ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '提取 RWA 收益' : 'Withdraw RWA Yield')}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 bg-white/[0.02] rounded-xl border border-white/10">
              <div className="w-14 h-14 rounded-xl bg-white/[0.02] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-white/20" />
              </div>
              <div className="text-white/40 text-sm">{isZh ? '暂无可提现收益' : 'No withdrawable yield'}</div>
              <div className="text-white/30 text-xs mt-1">{isZh ? '收益将在每日 08:00 发放' : 'Yield is settled daily at 08:00'}</div>
            </div>
          )}
        </div>
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
