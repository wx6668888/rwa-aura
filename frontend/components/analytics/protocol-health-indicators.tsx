'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { ShieldCheck, Droplets, TrendingUp, Users } from 'lucide-react'

export default function ProtocolHealthIndicators() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const indicators = [
    {
      icon: ShieldCheck,
      iconColor: '#00f5d4',
      title: t('analytics.secure'),
      score: t('analytics.auditCompleted'),
      scoreColor: '#10b981',
      description: t('analytics.auditsPassed'),
    },
    {
      icon: Droplets,
      iconColor: '#00f5d4',
      title: t('analytics.liquidity'),
      score: '$450K',
      scoreColor: '#00f5d4',
      description: t('analytics.availableRewards'),
      hasProgress: true,
      progressValue: 84,
    },
    {
      icon: TrendingUp,
      iconColor: '#10b981',
      title: t('analytics.growth'),
      score: '↑ 8.3%',
      scoreColor: '#10b981',
      description: t('analytics.tvlGrowth'),
      subdescription: t('analytics.continuousGrowth'),
    },
    {
      icon: Users,
      iconColor: '#00f5d4',
      title: t('analytics.activity'),
      score: '94.2%',
      scoreColor: '#00f5d4',
      description: t('analytics.activeRate'),
      subdescription: t('analytics.activeUserRatio'),
    },
  ]

  return (
    <div className="p-6 rounded-2xl border border-[#00f5d4] bg-[#0d0d14]/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.15)]">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-[#00f5d4]" />
        <div className="text-[16px] font-bold text-[#f1f5f9]">
          {t('analytics.health')}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-[#13131e] border border-[#ffffff0d] hover:border-[#ffffff1a] transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-6 h-6" style={{ color: indicator.iconColor }} />
              </div>

              <div
                className="text-[24px] font-bold font-mono mb-1"
                style={{ color: indicator.scoreColor, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {indicator.score}
              </div>

              <div className="text-[11px] uppercase tracking-wide text-[#64748b] mb-2">
                {indicator.title}
              </div>

              {indicator.hasProgress && (
                <div className="mb-2">
                  <div className="h-1 rounded-full bg-[#1a1a2e] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${indicator.progressValue}%`,
                        backgroundColor: indicator.iconColor,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-[#64748b] leading-relaxed">
                {indicator.description}
              </div>

              {indicator.subdescription && (
                <div className="mt-1 text-[11px]" style={{ color: indicator.scoreColor }}>
                  {indicator.subdescription}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
