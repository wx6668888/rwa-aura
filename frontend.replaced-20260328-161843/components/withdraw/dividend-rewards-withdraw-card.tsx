'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { TrendingUp, Loader2 } from 'lucide-react'

export function DividendRewardsWithdrawCard() {
  const { locale } = useLocale()
  const isZh = locale === 'zh'
  const { isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // TODO: 读取项目分红余额
  const balance = 0

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#8b5cf620] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-[#8b5cf6]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取项目分红' : 'Withdraw Dividend'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#8b5cf620] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf620] to-[#8b5cf608]">
          <TrendingUp className="h-5 w-5 text-[#8b5cf6]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取项目分红' : 'Withdraw Dividend'}</h3>
          <p className="text-xs text-[#64748b]">{isZh ? 'L2+参与' : 'L2+ eligible'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#8b5cf620] bg-[#8b5cf608] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748b]">{isZh ? '可提取' : 'Available'}</span>
            <span className="font-mono font-semibold text-[#8b5cf6]">{balance.toFixed(2)} USDT</span>
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
            className="w-full rounded-xl border border-[#8b5cf620] bg-[#0d0d1480] px-4 py-3 text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#8b5cf6] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#64748b]">
            {isZh ? '最低100 USDT，扣8%手续费' : 'Min 100 USDT, 8% fee'}
          </p>
        </div>

        <button
          disabled={loading || !amount || parseFloat(amount) < 100}
          className="w-full rounded-xl bg-[#8b5cf6] py-3 font-medium text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isZh ? '处理中...' : 'Processing...'}
            </span>
          ) : (
            isZh ? '提取分红' : 'Withdraw'
          )}
        </button>
      </div>
    </div>
  )
}
