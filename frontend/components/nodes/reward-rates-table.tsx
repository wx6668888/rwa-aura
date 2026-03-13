'use client'

import React from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useTeamStats } from '@/hooks/useTeamStats'
import { NODE_LEVELS, formatTeamVolumeRequirement, formatTeamRetainedRequirement } from '@/lib/node-levels'
import { MiniNodeHexIcon } from '@/components/nodes/node-hex-icon'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function RewardRatesTable() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const teamStats = useTeamStats()
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null)

  // RWA 价格
  const rwaPrice = 0.85

  // 计算个人总质押(链上实时数据)
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const rwaStakedInUSDT = rwaStaked * rwaPrice
  const personalStakeCurrent = usdtStaked + rwaStakedInUSDT

  // 使用链上团队数据
  const teamVolumeCurrent = teamStats.teamVolume
  const teamRetainedCurrent = teamStats.teamRetained

  // 根据实际数据计算当前等级
  let calculatedLevel = 1
  for (let i = NODE_LEVELS.length - 1; i >= 0; i--) {
    const level = NODE_LEVELS[i]
    const meetsPersonal = personalStakeCurrent >= (level.personalStakeUSDT || 0)
    const meetsTeam = teamVolumeCurrent >= level.teamVolumeUSDT
    const meetsRetained = teamRetainedCurrent >= (level.teamRetainedUSDT || 0)
    
    if (meetsPersonal && meetsTeam && meetsRetained) {
      calculatedLevel = level.level
      break
    }
  }

  const nodeLevel = isConnected ? calculatedLevel : 1

  const toggleExpand = (level: number) => {
    setExpandedLevel(expandedLevel === level ? null : level)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.08)]">
      {/* Header */}
      <div className="border-b border-[#00f5d420] px-5 py-5">
        <p className="text-[13px] uppercase tracking-widest text-[#00f5d4]" style={{ fontVariant: 'small-caps' }}>
          {t('nodes.ratesTitle')}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#00f5d420]">
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-[#334155]" style={{ fontVariant: 'small-caps' }}>
                {t('nodes.colLevel')}
              </th>
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-[#334155]" style={{ fontVariant: 'small-caps' }}>
                {t('nodes.colName')}
              </th>
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-[#334155]" style={{ fontVariant: 'small-caps' }}>
                {t('nodes.colRate')}
              </th>
              <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wider text-[#334155]" style={{ fontVariant: 'small-caps' }}>
                
              </th>
            </tr>
          </thead>
          <tbody>
            {NODE_LEVELS.map((level) => {
              const isCurrent = level.level === nodeLevel
              const isExpanded = expandedLevel === level.level
              const teamVolumeText = formatTeamVolumeRequirement(level.teamVolumeUSDT)
              const retainedText = (level.teamRetainedUSDT ?? 0) > 0 ? formatTeamRetainedRequirement(level.teamRetainedUSDT) : null

              return (
                <React.Fragment key={level.code}>
                  <tr
                    className={`border-b border-[#00f5d420] transition-colors cursor-pointer ${
                      isCurrent ? 'bg-[#13131e]' : 'hover:bg-[#0d0d1480]'
                    }`}
                    style={isCurrent ? { borderLeft: `3px solid ${level.color}` } : { borderLeft: '3px solid transparent' }}
                    onClick={() => toggleExpand(level.level)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MiniNodeHexIcon config={level} />
                        <span
                          className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-semibold"
                          style={{ color: isCurrent ? level.color : '#64748b' }}
                        >
                          {level.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] text-[#f1f5f9] font-medium">
                          {level.nameEn}
                        </span>
                        <span className="text-[11px] text-[#64748b] mt-0.5">
                          {level.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span
                          className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-medium"
                          style={{ color: isCurrent ? level.color : '#64748b' }}
                        >
                          {level.rewardPercentage}%
                        </span>
                        {level.projectDividendEligible && (
                          <span className="text-[10px] text-[#00f5d4] mt-0.5">
                            {t('nodes.projectDividendWeight', { weight: level.dividendWeight })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ChevronDown 
                        className={`w-4 h-4 text-[#64748b] inline-block transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-[#00f5d420] bg-[#0d0d14]">
                      <td colSpan={4} className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 升级要求 */}
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[#64748b] mb-3" style={{ fontVariant: 'small-caps' }}>
                              {t('nodes.colReq')}
                            </p>
                            <div className="space-y-2 text-[12px]">
                              {level.personalStakeUSDT > 0 && (
                                <div className="flex justify-between text-[#64748b]">
                                  <span>{t('nodes.personalStakeReq')}:</span>
                                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#f1f5f9]">
                                    {level.personalStakeUSDT.toLocaleString()} USDT
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-[#64748b]">
                                <span>{t('nodes.teamVolumeReq')}:</span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#00f5d4]">
                                  {teamVolumeText}
                                </span>
                              </div>
                              {retainedText && (
                                <div className="flex justify-between text-[#64748b]">
                                  <span>{t('portfolio.teamRetained')}:</span>
                                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#00f5d4]">
                                    {retainedText}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* 收益 */}
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[#64748b] mb-3" style={{ fontVariant: 'small-caps' }}>
                              {t('nodes.benefits')}
                            </p>
                            <div className="space-y-2 text-[12px]">
                              <div className="flex justify-between text-[#64748b]">
                                <span>{t('nodes.rewardPercent')}:</span>
                                <span 
                                  className="font-[family-name:var(--font-jetbrains-mono)] font-bold"
                                  style={{ color: level.color }}
                                >
                                  {level.rewardPercentage}%
                                </span>
                              </div>
                              {level.projectDividendEligible && (
                                <div className="flex justify-between text-[#64748b]">
                                  <span>{t('nodes.projectDividend')}:</span>
                                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#10b981]">
                                    {level.dividendWeight}x
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
