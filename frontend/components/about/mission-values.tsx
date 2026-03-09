'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { Unlock, Eye, Users } from 'lucide-react'

export function MissionValues() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const values = [
    {
      icon: Unlock,
      title: t('about.v1title'),
      desc: t('about.v1desc'),
    },
    {
      icon: Eye,
      title: t('about.v2title'),
      desc: t('about.v2desc'),
    },
    {
      icon: Users,
      title: t('about.v3title'),
      desc: t('about.v3desc'),
    },
  ]

  return (
    <section className="border-y border-[#ffffff0d] bg-[#0d0d14] px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('about.missionLabel')}
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-extrabold text-[#f1f5f9]">
            {t('about.missionTitle')}
          </h2>
        </div>

        {/* 3 value cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value, i) => {
            const Icon = value.icon
            return (
              <div
                key={i}
                className="group rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-8 text-center backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[#ffffff1a]"
              >
                {/* Icon container */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#13131e]">
                  <Icon className="h-7 w-7 text-[#00f5d4]" />
                </div>

                {/* Title */}
                <h3 className="mt-5 font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
                  {value.title}
                </h3>

                {/* Body */}
                <p className="mt-3 text-sm leading-7 text-[#64748b]">
                  {value.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
