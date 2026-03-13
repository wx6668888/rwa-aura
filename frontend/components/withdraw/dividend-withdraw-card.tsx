'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEstimatedDividend } from '@/hooks/useEstimatedDividend'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useTeamStats } from '@/hooks/useTeamStats'
import { getNodeLevelConfig, NODE_LEVELS } from '@/lib/node-levels'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { TrendingUp, Loader2 } from 'lucide-react'
import { parseUnits } from 'viem'

const RWA_PRICE = 0.85

export function DividendWithdrawCard() {
  const { locale } = useLocale()
  const { isConnected, address, chainId } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const teamStats = useTeamStats()
  const isZh = locale === 'zh'
  const [amount, setAmount] = useState('')

  // 计算等级
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const personalStakeCurrent = usdtStaked + rwaStaked * RWA_PRICE
  const teamVolumeCurrent = teamStats.teamVolume
  const teamRetainedCurrent = teamStats.teamRetained
  
  let calculatedLevel = 1
  for (let i = NODE_LEVELS.length - 1; i >= 0; i--) {
    const level = NODE_LEVELS[i]
    if (personalStakeCurrent >= (level.personalStakeUSDT || 0) &&
        teamVolumeCurrent >= level.teamVolumeUSDT &&
        teamRetainedCurrent >= (level.teamRetainedUSDT ?? 0)) {
      calculatedLevel = level.level
      break
    }
  }

  const { estimatedDividend } = useEstimatedDividend(calculatedLevel)
  const config = getNodeLevelConfig(calculatedLevel)
  const isEligible = config?.projectDividendEligible ?? false

  // TODO: 读取实际可提取余额（从 TeamDividendPool 合约）
  const availableBalance = 0 // 暂时为0，等合约部署后读取

  const { writeContract, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) < 100) {
      alert(isZh ? '最低提现金额为100 USDT' : 'Minimum withdrawal is 100 USDT')
      return
    }
    // TODO: 调用 TeamDividendPool.withdraw()
    alert(isZh ? '功能开发中' : 'Coming soon')
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#10b98120] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-[#10b981]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取项目分红' : 'Withdraw Dividend'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  if (!isEligible) {
    return (
      <div className="rounded-2xl border border-[#64748b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-[#64748b]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取项目分红' : 'Withdraw Dividend'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">
          {isZh ? '需要 L2 或更高等级才能参与项目分红' : 'Requires L2 or higher'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#10b98120] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="h-5 w-5 text-[#10b981]" />
        <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '提取项目分红' : 'Withdraw Dividend'}</h3>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#10b98120] bg-[#10b98108] p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#64748b]">{isZh ? '可提取余额' : 'Available'}</span>
            <span className="font-mono font-semibold text-[#10b981]">{availableBalance.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#64748b]">{isZh ? '预估分红' : 'Estimated'}</span>
            <span className="font-mono text-[#94a3b8]">{estimatedDividend.toFixed(2)} USDT</span>
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
            className="w-full rounded-xl border border-[#10b98120] bg-[#0d0d1480] px-4 py-3 text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#10b981] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#64748b]">
            {isZh ? '最低100 USDT，手续费8%' : 'Min 100 USDT, 8% fee'}
          </p>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={isPending || isConfirming || !amount || parseFloat(amount) < 100}
          className="w-full rounded-xl bg-[#10b981] py-3 font-medium text-white transition hover:bg-[#0ea472] disabled:opacity-50"
        >
          {isPending || isConfirming ? (
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
