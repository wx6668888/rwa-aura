'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { Users, Loader2 } from 'lucide-react'

export function ReferralWithdrawCard() {
  const { locale } = useLocale()
  const { isConnected } = useAccount()
  const { balance } = useReferralRewards()
  const isZh = locale === 'zh'
  const [amount, setAmount] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) < 100) {
      alert(isZh ? '最低提现金额为100 USDT' : 'Minimum withdrawal is 100 USDT')
      return
    }
    if (parseFloat(amount) > balance) {
      alert(isZh ? '余额不足' : 'Insufficient balance')
      return
    }
    // TODO: 调用 ReferralRewardPool.withdraw()
    alert(isZh ? '功能开发中' : 'Coming soon')
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-[#f59e0b]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取推荐奖励' : 'Withdraw Referral'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-5 w-5 text-[#f59e0b]" />
        <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取推荐奖励' : 'Withdraw Referral'}</h3>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#f59e0b20] bg-[#f59e0b08] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">{isZh ? '可提取余额' : 'Available'}</span>
            <span className="font-mono font-semibold text-[#f59e0b]">{balance.toFixed(2)} USDT</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#64748b] mb-2">
            {isZh ? '提现金额' : 'Amount'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            max={balance}
            className="w-full rounded-xl border border-[#f59e0b20] bg-[#0d0d1480] px-4 py-3 text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#f59e0b] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#64748b]">
            {isZh ? '最低100 USDT，手续费8%' : 'Min 100 USDT, 8% fee'}
          </p>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={isPending || !amount || parseFloat(amount) < 100 || parseFloat(amount) > balance}
          className="w-full rounded-xl bg-[#f59e0b] py-3 font-medium text-white transition hover:bg-[#d97706] disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isZh ? '处理中...' : 'Processing...'}
            </span>
          ) : (
            isZh ? '提取奖励' : 'Withdraw'
          )}
        </button>
      </div>
    </div>
  )
}
