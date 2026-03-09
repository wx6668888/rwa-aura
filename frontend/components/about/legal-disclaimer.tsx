'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function LegalDisclaimer() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="border-t border-[#ffffff0d] px-4 py-6 text-center lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] leading-6 text-[#334155]">
          {t('about.disclaimer')}
        </p>
      </div>
    </section>
  )
}
