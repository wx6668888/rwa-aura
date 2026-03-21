'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useTeamStats } from '@/hooks/useTeamStats'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useEstimatedDividend } from '@/hooks/useEstimatedDividend'
import { getNodeLevelConfig, NODE_LEVELS } from '@/lib/node-levels'
import { TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const RWA_PRICE = 0.85

export function ProjectDividendCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const teamStats = useTeamStats()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const isZh = locale === 'zh'

  // 计算等级
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const personalStakeCurrent = usdtStaked + rwaStaked * RWA_PRICE
  const teamVolumeCurrent = teamStats.teamVolume
  const teamRetainedCurrent = teamStats.teamRetained
  
  let calculatedLevel = 1
  for (let i = NODE_LEVELS.length - 1; i >= 0; i--) {
    const level = NODE_LEVELS[i]
    const meetsPersonal = personalStakeCurrent >= (level.personalStakeUSDT || 0)
    const meetsTeam = teamVolumeCurrent >= level.teamVolumeUSDT
    const meetsRetained = teamRetainedCurrent >= (level.teamRetainedUSDT ?? 0)
    if (meetsPersonal && meetsTeam && meetsRetained) {
      calculatedLevel = level.level
      break
    }
  }
  const nodeLevel = isConnected ? calculatedLevel : 1
  const config = getNodeLevelConfig(nodeLevel)
  const isEligible = config?.projectDividendEligible ?? false
  
  const { estimatedDividend, teamRetained } = useEstimatedDividend(nodeLevel)

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#10b98120] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b98120] to-[#10b98108]">
            <TrendingUp className="h-6 w-6 text-[#10b981]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
              {isZh ? '项目分红' : 'Project Dividend'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isZh ? 'L2+ 参与' : 'L2+ Eligible'}
            </p>
          </div>
        </div>
        <p className="text-sm text-[#64748b]">
          {isZh ? '连接钱包后查看您的分红资格' : 'Connect wallet to view eligibility'}
        </p>
      </div>
    )
  }

  if (!isEligible) {
    return (
      <div className="rounded-2xl border border-[#64748b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#64748b20]">
            <TrendingUp className="h-6 w-6 text-[#64748b]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
              {isZh ? '项目分红' : 'Project Dividend'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isZh ? '需要 L2 或更高等级' : 'Requires L2 or higher'}
            </p>
          </div>
        </div>
        <p className="text-sm text-[#64748b]">
          {isZh 
            ? `您当前为 ${config?.code}，升级到 L2 后可参与项目分红` 
            : `You are ${config?.code}. Upgrade to L2 to participate`}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#10b98120] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.1)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b98120] to-[#10b98108]">
            <TrendingUp className="h-6 w-6 text-[#10b981]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
              {isZh ? '项目分红' : 'Project Dividend'}
            </h3>
            <p className="text-xs text-[#10b981]">
              {config?.code} · {(config?.dividendWeight ?? 0) * 100}%
            </p>
          </div>
        </div>
        <Link 
          href="/withdraw"
          className="flex items-center gap-1 text-xs text-[#10b981] hover:text-[#0ea472] transition-colors"
        >
          {isZh ? '去提现' : 'Withdraw'}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-[#10b98120] bg-[#10b98108] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-[#64748b]">
              {isZh ? '分红比例' : 'Dividend Rate'}
            </span>
            <div className="text-right">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#10b981]">
                {((config?.dividendWeight ?? 0) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-[#64748b]">{isZh ? '基于团队留存' : 'Of Team Retained'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748b]">{isZh ? '团队总留存' : 'Team Retained'}</span>
            <span className="font-mono text-[#94a3b8]">
              {teamRetained.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#10b98120] flex items-center justify-between text-xs">
            <span className="text-[#64748b]">{isZh ? '预估分红' : 'Estimated'}</span>
            <span className="font-mono text-[#10b981] font-semibold">
              ≈ {estimatedDividend.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>

        <div className="text-[10px] text-[#64748b] flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#10b981]"></span>
          {isZh 
            ? '每月1日结算，满100 USDT可提现，手续费8%' 
            : 'Settled monthly on 1st, min 100 USDT, 8% fee'}
        </div>
      </div>
    </div>
  )
}
