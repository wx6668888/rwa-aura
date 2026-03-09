'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const statKeys = [
  { valueKey: 'stats.tvl.value', labelKey: 'stats.tvl.label' },
  { valueKey: 'stats.stakers.value', labelKey: 'stats.stakers.label' },
  { valueKey: 'stats.price.value', labelKey: 'stats.price.label' },
]

export function StatsBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="border-y border-border-subtle">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-8 sm:gap-4 lg:flex lg:items-center lg:justify-center lg:gap-0 lg:divide-x lg:divide-border-subtle lg:px-8">
        {statKeys.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center lg:px-16"
          >
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-plasma-cyan sm:text-2xl lg:text-4xl">
              {t(stat.valueKey)}
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-text-secondary sm:text-[11px] sm:tracking-[0.2em]">
              {t(stat.labelKey)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
