'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export function ProtocolNumbers() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const stats = [
    { value: t('about.protocolStat1Value'), label: t('about.protocolStat1Label') },
    { value: t('about.protocolStat2Value'), label: t('about.protocolStat2Label') },
    { value: t('about.protocolStat3Value'), label: t('about.protocolStat3Label') },
    { value: t('about.protocolStat4Value'), label: t('about.protocolStat4Label') },
    { value: t('about.protocolStat5Value'), label: t('about.protocolStat5Label') },
    { value: t('about.protocolStat6Value'), label: t('about.protocolStat6Label') },
  ]

  return (
    <section className="border-y-2 border-[#00f5d4] bg-[#0d0d14] px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`border-[#ffffff0d] p-6 text-center ${
                i < stats.length - 1 ? 'border-r' : ''
              } last:border-r-0`}
            >
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-4xl font-black text-[#00f5d4]">
                {stat.value}
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
