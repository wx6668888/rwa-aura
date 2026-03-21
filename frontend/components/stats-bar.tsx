'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useHomepageStats } from '@/hooks/useHomepageStats'
import { displayUserCount, formatUsdAmount } from '@/lib/stats-display'

export function StatsBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const stats = useHomepageStats()

  const tvlUsdtText = formatUsdAmount(stats.tvlUsdt)

  const statItems = [
    { value: tvlUsdtText, label: t('stats.tvl.label') },
    { value: displayUserCount(stats.users).toLocaleString(), label: t('stats.stakers.label') },
    { value: `$${stats.price.toFixed(2)}`, label: t('stats.price.label') },
  ]

  return (
    <section className="border-y border-border-subtle">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-8 sm:gap-4 lg:flex lg:items-center lg:justify-center lg:gap-0 lg:divide-x lg:divide-border-subtle lg:px-8">
        {statItems.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center lg:px-16"
          >
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-plasma-cyan sm:text-2xl lg:text-4xl">
              {stat.value}
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-text-secondary sm:text-[11px] sm:tracking-[0.2em]">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
