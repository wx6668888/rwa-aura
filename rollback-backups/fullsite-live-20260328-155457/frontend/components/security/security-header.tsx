'use client'

import { ShieldCheck } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function SecurityHeader() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div className="pb-8 pt-12 text-center">
      <div className="relative mx-auto inline-flex h-12 w-12 items-center justify-center">
        <ShieldCheck className="h-12 w-12 text-[#00f5d4]" />
        <div className="absolute inset-0 animate-ping rounded-full bg-[#00f5d4] opacity-20" />
      </div>

      <p
        className="mt-4 text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.overline')}
      </p>

      <h1 className="mx-auto mt-3 max-w-2xl px-4 font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold leading-tight text-[#f1f5f9] sm:px-0 sm:text-[40px]">
        {t('security.title')}
      </h1>

      <p className="mx-auto mt-4 max-w-xl px-4 text-sm text-[#64748b] sm:px-0 sm:text-base">
        {t('security.subtitle')}
      </p>
    </div>
  )
}
