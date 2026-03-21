'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, Users, Award } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { NODE_LEVELS } from '@/lib/node-levels'

interface NodeLevelData {
  level: number
  code: string
  name: string
  nameEn: string
  emoji: string
  color: string
  requirements: {
    personalStake: number
    teamVolume: number
    teamRetained: number
  }
  benefits: {
    staticYield: string
    dynamicBonus: string
    projectDividend?: string
  }
}

const getNodeLevels = (t: (key: string) => string): NodeLevelData[] => {
  return NODE_LEVELS.map((config) => ({
    level: config.level,
    code: config.code,
    name: config.name,
    nameEn: config.nameEn,
    emoji: config.emoji,
    color: config.color,
    requirements: {
      personalStake: config.personalStakeUSDT,
      teamVolume: config.teamVolumeUSDT,
      teamRetained: config.teamRetainedUSDT ?? 0,
    },
    benefits: {
      staticYield: `0.8% ${t('nodeLevels.dailyYield')}`,
      dynamicBonus: `${config.rewardPercentage}% ${t('nodeLevels.dynamicBonus')}`,
      ...(config.projectDividendEligible && {
        projectDividend: `${t('nodeLevels.projectDividend')} (${config.dividendWeight}x ${t('nodeLevels.dividendWeight')})`,
      }),
    },
  }))
}

function NodeLevelCard({ data, isExpanded, onToggle, t }: { 
  data: NodeLevelData
  isExpanded: boolean
  onToggle: () => void
  t: (key: string) => string
}) {
  const getInfoText = () => {
    const infoKey = `nodeLevels.l${data.level}Info` as keyof typeof t
    return t(infoKey) || ''
  }

  return (
    <div
      className="rounded-xl border bg-[#0d0d14] transition-all duration-200"
      style={{ 
        borderColor: isExpanded ? data.color : '#ffffff0d',
        boxShadow: isExpanded ? `0 0 20px ${data.color}40` : 'none',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#13131e]"
      >
        <div className="flex items-center gap-3">
          {/* Level Badge */}
          <div
            className="flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg font-bold text-2xl"
            style={{ 
              background: `${data.color}20`,
              color: data.color,
              border: `2px solid ${data.color}`,
            }}
          >
            {data.emoji}
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-[#f1f5f9]">
              {t('nodeLevels.nodeLevel')} {data.code} - {data.nameEn}
            </h3>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-[#64748b]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#64748b]" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#ffffff0d] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Requirements */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: data.color }} />
                <h4 className="text-sm font-semibold text-[#f1f5f9]">{t('nodeLevels.upgradeReqs')}</h4>
              </div>
              <div className="space-y-2 rounded-lg bg-[#13131e] p-3">
                {data.requirements.personalStake > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">{t('portfolio.personalStake')}</span>
                    <span className="font-mono text-[#f1f5f9]">
                      ≥ {data.requirements.personalStake.toLocaleString()} USDT
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b]">{t('portfolio.teamVolume')}</span>
                  <span className="font-mono text-[#f1f5f9]">
                    {data.requirements.teamVolume === 0 ? t('nodeLevels.noRequirement') : `≥ ${data.requirements.teamVolume.toLocaleString()} USDT`}
                  </span>
                </div>
                {data.requirements.teamRetained > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">{t('portfolio.teamRetained')}</span>
                    <span className="font-mono text-[#f1f5f9]">
                      ≥ {data.requirements.teamRetained.toLocaleString()} USDT
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: data.color }} />
                <h4 className="text-sm font-semibold text-[#f1f5f9]">{t('nodeLevels.benefits')}</h4>
              </div>
              <div className="space-y-2 rounded-lg bg-[#13131e] p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b]">{t('nodeLevels.staticYield')}</span>
                  <span className="font-mono" style={{ color: data.color }}>
                    {data.benefits.staticYield}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b]">{t('nodeLevels.dynamicBonus')}</span>
                  <span className="font-mono text-[#8b5cf6]">
                    {data.benefits.dynamicBonus}
                  </span>
                </div>
                {data.benefits.projectDividend && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">{t('nodeLevels.projectDividend') || '项目分红'}</span>
                    <span className="font-mono text-[#f59e0b]">
                      {data.benefits.projectDividend}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-4 rounded-lg border border-[#ffffff0d] bg-[#0d0d14] p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: data.color }} />
              <div className="text-xs text-[#64748b]">
                <p>{getInfoText()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function NodeLevelsInfo() {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null)
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const nodeLevels = getNodeLevels(t)

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl"
      style={{ border: '1px solid #00f5d420', boxShadow: '0 0 20px rgba(0,245,212,0.05)' }}
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#f1f5f9]">{t('nodeLevels.title')}</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {t('nodeLevels.subtitle')}
        </p>
      </div>

      {/* Level Cards */}
      <div className="space-y-3">
        {nodeLevels.map((level) => (
          <NodeLevelCard
            key={level.level}
            data={level}
            isExpanded={expandedLevel === level.level}
            onToggle={() => setExpandedLevel(expandedLevel === level.level ? null : level.level)}
            t={t}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-xl border border-[#00f5d420] bg-[#00f5d410] p-4">
        <h3 className="mb-2 text-sm font-semibold text-[#00f5d4]">{t('nodeLevels.yieldExplainTitle')}</h3>
        <ul className="space-y-1 text-xs text-[#64748b]">
          <li>• {t('nodeLevels.yieldExplain1')}</li>
          <li>• {t('nodeLevels.yieldExplain2')}</li>
          <li>• {t('nodeLevels.yieldExplain3')}</li>
          <li>• {t('nodeLevels.yieldExplain4')}</li>
        </ul>
      </div>
    </div>
  )
}
