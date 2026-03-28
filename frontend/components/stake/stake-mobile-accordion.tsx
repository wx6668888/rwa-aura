'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import { StakeInfoPanelContent } from '@/components/stake/stake-info-panel'

export function StakeMobileAccordion() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-[20px] border border-[#00f5d4]/22 bg-[#1c1c22] shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-full items-center justify-between px-4 text-left text-sm font-semibold text-[#f1f5f9] sm:px-5"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-[#00f5d4]" aria-hidden />
          {t('info.infoToggle')}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '2000px' : '0px' }}
      >
        <div className="border-t border-[#ffffff0d] px-4 pb-5 pt-1 sm:px-5">
          <StakeInfoPanelContent />
        </div>
      </div>
    </div>
  )
}
