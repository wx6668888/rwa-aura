'use client'

import { ShieldCheck, GitBranch, TrendingUp } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  desc: string
}

function FeatureCard({ icon: Icon, title, desc }: FeatureCardProps) {
  return (
    <div
      className="group flex flex-col gap-4 rounded-2xl bg-[#0d0d14] p-8 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{ border: '1px solid transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid #ffffff1a'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid transparent'
      }}
    >
      <Icon className="h-8 w-8 text-[#00f5d4]" strokeWidth={1.5} />
      <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed text-[#64748b]">{desc}</p>
    </div>
  )
}

export function FeaturesSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const cards = [
    { icon: ShieldCheck, titleKey: 'features.f1.title', descKey: 'features.f1.desc' },
    { icon: GitBranch,   titleKey: 'features.f2.title', descKey: 'features.f2.desc' },
    { icon: TrendingUp,  titleKey: 'features.f3.title', descKey: 'features.f3.desc' },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <div className="mb-12 space-y-3">
        <p
          className="text-[11px] uppercase tracking-[0.2em] text-[#64748b]"
          style={{ fontVariant: 'small-caps' }}
        >
          {t('features.label')}
        </p>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-[40px] font-extrabold text-[#f1f5f9]">
          {t('features.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <FeatureCard
            key={c.titleKey}
            icon={c.icon}
            title={t(c.titleKey)}
            desc={t(c.descKey)}
          />
        ))}
      </div>
    </section>
  )
}
