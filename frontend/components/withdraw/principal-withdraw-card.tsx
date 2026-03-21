'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { useStakingContract } from '@/hooks/useStakingContract'
import { Wallet, Loader2 } from 'lucide-react'

export function PrincipalWithdrawCard() {
  const { locale } = useLocale()
  const isZh = locale === 'zh'
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const usdtPrincipal = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaPrincipal = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#64748b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="h-5 w-5 text-[#64748b]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取本金' : 'Withdraw Principal'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#64748b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#64748b20]">
          <Wallet className="h-5 w-5 text-[#94a3b8]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取本金' : 'Withdraw Principal'}</h3>
          <p className="text-xs text-[#64748b]">{isZh ? '销毁质押凭证' : 'Burn staking receipt'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#64748b20] bg-[#0d0d1480] p-3">
            <p className="text-xs text-[#64748b] mb-1">{isZh ? 'USDT本金' : 'USDT'}</p>
            <p className="font-mono text-sm text-[#f1f5f9]">{usdtPrincipal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-[#64748b20] bg-[#0d0d1480] p-3">
            <p className="text-xs text-[#64748b] mb-1">{isZh ? 'RWA本金' : 'RWA'}</p>
            <p className="font-mono text-sm text-[#f1f5f9]">{rwaPrincipal.toFixed(2)}</p>
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
            className="w-full rounded-xl border border-[#64748b20] bg-[#0d0d1480] px-4 py-3 text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#94a3b8] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#64748b]">
            {isZh ? '最低100，扣8%手续费' : 'Min 100, 8% fee'}
          </p>
        </div>

        <button
          disabled={loading || !amount}
          className="w-full rounded-xl bg-[#94a3b8] py-3 font-medium text-white transition hover:bg-[#64748b] disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isZh ? '处理中...' : 'Processing...'}
            </span>
          ) : (
            isZh ? '提取本金' : 'Withdraw'
          )}
        </button>
      </div>
    </div>
  )
}
