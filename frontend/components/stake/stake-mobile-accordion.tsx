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
    <div className="overflow-hidden rounded-[28px] border-2 border-plasma-cyan/25 bg-surface-1/95 shadow-[0_0_48px_rgba(0,245,212,0.12)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative z-[1] flex h-14 w-full items-center justify-between px-4 text-left text-sm font-semibold text-text-primary sm:px-5"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-plasma-cyan" aria-hidden />
          {t('info.infoToggle')}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="relative z-[1] overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '2000px' : '0px' }}
      >
        <div className="border-t border-border-subtle px-4 pb-5 pt-1 sm:px-5">
          <StakeInfoPanelContent />
        </div>
      </div>
    </div>
  )
}
