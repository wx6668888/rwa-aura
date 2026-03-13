'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useTeamStats } from '@/hooks/useTeamStats'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { NODE_LEVELS, getNodeLevelConfig, getNextLevelConfig, formatTeamVolumeRequirement, formatTeamRetainedRequirement } from '@/lib/node-levels'
import { NodeHexIcon } from '@/components/nodes/node-hex-icon'
import { useState } from 'react'

function LevelStepper({ currentLevel, onLevelClick }: { currentLevel: number; onLevelClick?: (level: number) => void }) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  const handleClick = (level: number) => {
    setSelectedLevel(level)
    onLevelClick?.(level)
  }

  return (
    <div className="mt-8 w-full">
      {/* 桌面端和移动端都使用横向滚动，确保所有节点都能显示 */}
      <div className="flex items-center justify-start gap-0 overflow-x-auto pb-4 scrollbar-hide" style={{ 
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        minWidth: '100%'
      }}>
        {NODE_LEVELS.map((level, i) => {
          const isCurrent = level.level === currentLevel
          const isDone = level.level < currentLevel
          const isLocked = level.level > currentLevel
          const isSelected = selectedLevel === level.level

          return (
            <div 
              key={level.code} 
              className="flex items-center flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="flex flex-col items-center gap-1.5 px-2 md:px-1 min-w-[65px] md:min-w-[55px]">
                <div 
                  className={`relative transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}
                  onClick={() => handleClick(level.level)}
                >
                  {isCurrent ? (
                    <NodeHexIcon 
                      config={level} 
                      size={44} 
                      isInteractive={true}
                      isUnlocked={true}
                    />
                  ) : isDone ? (
                    <NodeHexIcon 
                      config={level} 
                      size={40} 
                      isInteractive={true}
                      isUnlocked={true}
                      onClick={() => handleClick(level.level)}
                    />
                  ) : (
                    <NodeHexIcon 
                      config={level} 
                      size={40} 
                      isInteractive={true}
                      isUnlocked={false}
                      onClick={() => handleClick(level.level)}
                    />
                  )}
              </div>
            <span
                  className="text-[10px] md:text-[10px] whitespace-nowrap text-center"
                  style={{ 
                    color: isCurrent ? level.color : isDone ? '#00f5d4' : '#334155',
                    fontWeight: isCurrent ? '600' : '400'
                  }}
            >
                  {level.nameEn}
                </span>
                <span className="text-[8px] text-[#64748b] whitespace-nowrap">
                  {level.code}
            </span>
          </div>
              {i < NODE_LEVELS.length - 1 && (
            <div
                  className="mx-2 md:mx-1 h-px w-6 md:w-4 lg:w-6 flex-shrink-0"
              style={{
                    background: isDone
                  ? 'linear-gradient(90deg, #00f5d4, #f59e0b)'
                      : 'none',
                    borderTop: !isDone ? '1px dashed #334155' : undefined,
              }}
            />
          )}
        </div>
          )
        })}
      </div>
      
      {/* 选中节点的详细信息 */}
      {selectedLevel !== null && (
        <div className="mt-4 mx-auto max-w-sm rounded-xl border border-[#00f5d420] bg-[#13131e] p-4 animate-fadeIn">
          {(() => {
            const selectedConfig = NODE_LEVELS.find(l => l.level === selectedLevel)
            if (!selectedConfig) return null
            
            const isUnlocked = selectedLevel <= currentLevel
            
            return (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <NodeHexIcon 
                    config={selectedConfig} 
                    size={80} 
                    isUnlocked={isUnlocked}
                  />
                </div>
                <h3 className="text-lg font-bold text-[#f1f5f9] mb-1">
                  {selectedConfig.nameEn} ({selectedConfig.code})
                </h3>
                <p className="text-sm text-[#64748b] mb-3">
                  {selectedConfig.name}
                </p>
                <div className="text-left space-y-2 text-xs text-[#64748b]">
                  <div className="flex justify-between">
                    <span>{t('nodes.rewardPercent')}</span>
                    <span className="text-[#f59e0b] font-semibold">{selectedConfig.rewardPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('nodes.teamVolumeReq')}</span>
                    <span className="text-[#00f5d4] font-mono">
                      {formatTeamVolumeRequirement(selectedConfig.teamVolumeUSDT)}
                    </span>
                  </div>
                  {(selectedConfig.teamRetainedUSDT ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>{t('portfolio.teamRetained')}</span>
                      <span className="text-[#00f5d4] font-mono">
                        {formatTeamRetainedRequirement(selectedConfig.teamRetainedUSDT ?? 0)}
                      </span>
                    </div>
                  )}
                  {selectedConfig.projectDividendEligible && (
                    <div className="flex justify-between">
                      <span>{t('nodes.projectDividend')}</span>
                      <span className="text-[#10b981] font-semibold">{selectedConfig.dividendWeight}x</span>
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="mt-3 pt-3 border-t border-[#00f5d420] text-center">
                      <span className="text-[#f43f5e]">🔒 {t('nodes.locked')}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function RequirementsCard({ currentLevel }: { currentLevel: number }) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const teamStats = useTeamStats()

  // RWA 价格（用于转换）
  const rwaPrice = 0.85

  // 个人总质押 = USDT 质押 + RWA 质押（转换为 USDT 等值）
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const rwaStakedInUSDT = rwaStaked * rwaPrice
  const personalStakeCurrent = usdtStaked + rwaStakedInUSDT

  // 使用链上团队数据
  const teamVolumeCurrent = teamStats.teamVolume
  const teamRetainedCurrent = teamStats.teamRetained

  // 获取下一级要求
  const nextLevelConfig = NODE_LEVELS.find((l) => l.level === currentLevel + 1)
  const teamVolumeRequired = nextLevelConfig?.teamVolumeUSDT || 0
  const teamRetainedRequired = nextLevelConfig?.teamRetainedUSDT ?? 0

  // 计算升级进度百分比（取个人、团队、留存三者最小）
  const teamProgress = teamVolumeRequired > 0 ? Math.min(100, (teamVolumeCurrent / teamVolumeRequired) * 100) : 0
  const retainedProgress = teamRetainedRequired > 0 ? Math.min(100, (teamRetainedCurrent / teamRetainedRequired) * 100) : 0
  const upgradeProgress = Math.min(teamProgress, retainedProgress)

  if (!nextLevelConfig) {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#00f5d420] bg-[#13131e] p-5 text-center">
        <p className="text-[13px] text-[#64748b]">
          {t('nodes.maxLevelReached')}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#00f5d420] bg-[#13131e] p-5 text-left">
      <p className="text-[11px] uppercase tracking-widest text-[#00f5d4] mb-4" style={{ fontVariant: 'small-caps' }}>
        {t('nodes.upgradeToNext', { level: nextLevelConfig.code })}
      </p>
      
      {/* 统计信息 */}
      <div className="mb-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-[#64748b]">{t('nodes.personalPerformance')}</span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#f1f5f9] font-semibold">
            {isConnected 
              ? `${personalStakeCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
              : '0 USDT'
            }
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-[#64748b]">{t('nodes.teamTotalPerformance')}</span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#00f5d4] font-semibold">
            {isConnected 
              ? `${teamVolumeCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
              : '0 USDT'
            }
          </span>
        </div>
        {nextLevelConfig && (
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-[#64748b]">{t('nodes.upgradeProgress')}</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#f59e0b] font-semibold">
              {upgradeProgress.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* Personal Stake Requirement */}
        {nextLevelConfig && nextLevelConfig.personalStakeUSDT > 0 && (
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[13px] text-[#64748b]">
                {t('nodes.personalStakeReq')}
              </span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#64748b]">
                {isConnected 
                  ? `${personalStakeCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${nextLevelConfig.personalStakeUSDT.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
                  : `0 / ${nextLevelConfig.personalStakeUSDT.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
                }
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a2e]">
              {(() => {
                const personalProgress = nextLevelConfig.personalStakeUSDT > 0
                  ? Math.min(100, (personalStakeCurrent / nextLevelConfig.personalStakeUSDT) * 100)
                  : 0
                return (
            <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] to-[#f59e0b] transition-all duration-300" 
                    style={{ width: `${personalProgress}%` }}
            />
                )
              })()}
          </div>
            <p className="mt-1.5 text-[11px] text-[#64748b]">
              {isConnected && nextLevelConfig.personalStakeUSDT > personalStakeCurrent
                ? t('nodes.needMoreUSDT', { amount: (nextLevelConfig.personalStakeUSDT - personalStakeCurrent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), pct: ((personalStakeCurrent / nextLevelConfig.personalStakeUSDT) * 100).toFixed(1) })
                : t('nodes.personalStakeMet', { pct: ((personalStakeCurrent / nextLevelConfig.personalStakeUSDT) * 100).toFixed(1) })
              }
          </p>
        </div>
        )}

        {/* Team Volume Requirement */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[13px] text-[#64748b]">
              {t('nodes.teamTotalPerformance')}
            </span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#64748b]">
              {isConnected 
                ? `${teamVolumeCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${teamVolumeRequired.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
                : `0 / ${teamVolumeRequired.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
              }
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a2e]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] to-[#f59e0b] transition-all duration-300" 
              style={{ width: `${teamProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#64748b]">
            {isConnected && teamVolumeRequired > teamVolumeCurrent
              ? t('nodes.needMoreToUpgrade', { amount: (teamVolumeRequired - teamVolumeCurrent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), level: nextLevelConfig.nameEn })
              : nextLevelConfig ? t('nodes.upgradeTo', { level: nextLevelConfig.nameEn, code: nextLevelConfig.code }) : ''
            }
          </p>
        </div>

        {/* Team Retained Requirement */}
        {teamRetainedRequired > 0 && (
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[13px] text-[#64748b]">
                {t('portfolio.teamRetained')}
              </span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#64748b]">
                {isConnected 
                  ? `${teamRetainedCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${teamRetainedRequired.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
                  : `0 / ${teamRetainedRequired.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
                }
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a2e]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] to-[#f59e0b] transition-all duration-300" 
                style={{ width: `${retainedProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function NodeStatusCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const teamStats = useTeamStats()
  const { count: directRefsCount } = useDirectReferrals()

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

  // 使用计算出的等级
  const nodeLevel = isConnected ? calculatedLevel : 1
  const currentLevelConfig = getNodeLevelConfig(nodeLevel) || NODE_LEVELS[0]

  return (
    <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-8 text-center backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.08)]">
      {/* Large hexagon badge - 修复显示不完整问题 */}
      <div className="flex justify-center" style={{ filter: `drop-shadow(0 0 40px ${currentLevelConfig.glowColor})` }}>
        <NodeHexIcon 
          config={currentLevelConfig} 
          size={120} 
          showCode={false}
          isUnlocked={true}
        />
      </div>

      {/* Node name */}
      <p className="mt-3 text-[13px] uppercase tracking-widest" style={{ color: currentLevelConfig.color, fontVariant: 'small-caps' }}>
        {currentLevelConfig.nameEn} ({currentLevelConfig.code})
      </p>
      <p className="mt-1 text-[11px] text-[#64748b]">
        {currentLevelConfig.name}
      </p>

      {/* Level stepper - 支持点击交互 */}
      <LevelStepper currentLevel={nodeLevel} />

      {/* Requirements card */}
      {isConnected && <RequirementsCard currentLevel={nodeLevel} />}
    </div>
  )
}
