'use client'

import { RefreshCw } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function LiveIndicatorBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div
      className="sticky z-40 flex h-11 items-center justify-between border-b border-[#ffffff0d] bg-[#0d0d14] px-6"
      style={{ top: 'var(--navbar-stack)' }}
    >
      <div className="flex items-center gap-3">
        {/* green pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-widest text-[#10b981]">
          {t('gov.liveLabel')}
        </span>
        <span className="ml-3 text-xs text-[#64748b]">{t('gov.liveSource')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#64748b]">{t('gov.lastSync')}</span>
        <RefreshCw className="animate-refresh-spin h-3 w-3 text-[#64748b]" />
      </div>
    </div>
  )
}
