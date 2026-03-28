'use client'

import { CheckCircle } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function SecurityHistory() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-16">
      <p
        className="text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.securityHistory')}
      </p>

      <div className="mt-6 rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-4 backdrop-blur-xl sm:p-6">
        {/* Empty state */}
        <div className="py-6 text-center sm:py-8">
          <CheckCircle className="mx-auto h-8 w-8 text-[#10b981] sm:h-10 sm:w-10" />
          <h3 className="mt-3 text-sm font-semibold text-[#f1f5f9] sm:text-base">
            {t('security.noIncidents')}
          </h3>
          <p className="mt-1 text-xs text-[#64748b] sm:text-[13px]">
            {t('security.noIncidentsDescription')}
          </p>
          <p className="mt-2 text-xs text-[#334155]">
            {t('security.launchDate')}: {t('security.launchDatePlaceholder')}
          </p>
        </div>
      </div>

      <p className="mt-3 px-4 text-center text-xs text-[#64748b] sm:px-0">
        {t('security.incidentDisclosure')}
      </p>
    </section>
  )
}
