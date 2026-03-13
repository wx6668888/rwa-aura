'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { useStakingContract } from '@/hooks/useStakingContract'
import { TrendingUp, Loader2 } from 'lucide-react'

export function RwaRewardsWithdrawCard() {
  const { locale } = useLocale()
  const isZh = locale === 'zh'
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo, withdrawRWARewards } = useStakingContract()
  
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'rwa' | 'strwa'>('rwa')
  const [loading, setLoading] = useState(false)

  const rwaRewards = parseFloat(userStakeInfo?.rwaPending || '0') + parseFloat(rwaStakeInfo?.rwaPending || '0')

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 100) {
      alert(isZh ? '最低提现100 RWA' : 'Min 100 RWA')
      return
    }
    setLoading(true)
    try {
      // TODO: 调用合约
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert(isZh ? '提现成功' : 'Success')
      setAmount('')
    } catch (error) {
      alert(isZh ? '提现失败' : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-[#f59e0b]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取RWA收益' : 'Withdraw RWA Rewards'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b20] to-[#f59e0b08]">
          <TrendingUp className="h-5 w-5 text-[#f59e0b]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取RWA收益' : 'Withdraw RWA Rewards'}</h3>
          <p className="text-xs text-[#64748b]">{isZh ? '可选RWA或stRWA' : 'RWA or stRWA'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 可用余额 */}
        <div className="rounded-xl border border-[#f59e0b20] bg-[#f59e0b08] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">{isZh ? '可提取' : 'Available'}</span>
            <span className="font-mono font-semibold text-[#f59e0b]">{rwaRewards.toFixed(2)} RWA</span>
          </div>
        </div>

        {/* 提现模式选择 */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('rwa')}
            className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
              mode === 'rwa'
                ? 'bg-[#f59e0b] text-white'
                : 'bg-[#0d0d1480] text-[#64748b] border border-[#f59e0b20]'
            }`}
          >
            {isZh ? '提取RWA' : 'Withdraw RWA'}
            <div className="text-xs mt-1">{isZh ? '扣8%手续费' : '8% fee'}</div>
          </button>
          <button
            onClick={() => setMode('strwa')}
            className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
              mode === 'strwa'
                ? 'bg-[#10b981] text-white'
                : 'bg-[#0d0d1480] text-[#64748b] border border-[#10b98120]'
            }`}
          >
            {isZh ? '转为stRWA' : 'Convert to stRWA'}
            <div className="text-xs mt-1">{isZh ? '120%增值' : '120% bonus'}</div>
          </button>
        </div>

        {/* 金额输入 */}
        <div>
          <label className="block text-sm text-[#64748b] mb-2">
            {isZh ? '提现金额' : 'Amount'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full rounded-xl border border-[#f59e0b20] bg-[#0d0d1480] px-4 py-3 text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#f59e0b] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#64748b]">
            {mode === 'rwa' 
              ? (isZh ? '最低100 RWA，扣8%手续费' : 'Min 100 RWA, 8% fee')
              : (isZh ? '最低100 RWA，锁仓30天，获得120%' : 'Min 100 RWA, 30d lock, 120% bonus')
            }
          </p>
        </div>

        {/* 提现按钮 */}
        <button
          onClick={handleWithdraw}
          disabled={loading || !amount || parseFloat(amount) < 100}
          className={`w-full rounded-xl py-3 font-medium text-white transition ${
            mode === 'rwa' ? 'bg-[#f59e0b] hover:bg-[#d97706]' : 'bg-[#10b981] hover:bg-[#0ea472]'
          } disabled:opacity-50`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isZh ? '处理中...' : 'Processing...'}
            </span>
          ) : (
            isZh ? '确认提现' : 'Confirm'
          )}
        </button>
      </div>
    </div>
  )
}
