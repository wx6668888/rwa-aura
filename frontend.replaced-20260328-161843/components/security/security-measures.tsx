'use client'

import { Lock, Users, Shield, Eye, AlertOctagon, Activity } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const measures = [
  {
    id: 'timelock',
    icon: Lock,
    titleKey: 'security.measure1Title',
    bodyKey: 'security.measure1Body',
  },
  {
    id: 'multisig',
    icon: Users,
    titleKey: 'security.measure2Title',
    bodyKey: 'security.measure2Body',
  },
  {
    id: 'rewardCap',
    icon: Shield,
    titleKey: 'security.measure3Title',
    bodyKey: 'security.measure3Body',
  },
  {
    id: 'openSource',
    icon: Eye,
    titleKey: 'security.measure4Title',
    bodyKey: 'security.measure4Body',
  },
  {
    id: 'pause',
    icon: AlertOctagon,
    titleKey: 'security.measure5Title',
    bodyKey: 'security.measure5Body',
  },
  {
    id: 'monitoring',
    icon: Activity,
    titleKey: 'security.measure6Title',
    bodyKey: 'security.measure6Body',
  },
]

export function SecurityMeasures() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-16">
      <p
        className="text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.securityMeasures')}
      </p>

      <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9] sm:text-[28px]">
        {t('security.measuresTitle')}
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {measures.map((measure) => {
          const Icon = measure.icon
          return (
            <div
              key={measure.id}
              className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-4 backdrop-blur-xl transition-all duration-200 hover:border-[#ffffff1a] hover:-translate-y-0.5 sm:p-5"
            >
              <Icon className="h-6 w-6 text-[#00f5d4] sm:h-7 sm:w-7" />
              <h3 className="mt-3 text-sm font-bold text-[#f1f5f9] sm:text-[15px]">
                {t(measure.titleKey)}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748b] sm:text-[13px]">
                {t(measure.bodyKey)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
