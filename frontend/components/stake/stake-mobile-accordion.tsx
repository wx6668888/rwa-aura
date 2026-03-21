'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { StakeInfoPanelContent } from '@/components/stake/stake-info-panel'

export function StakeMobileAccordion() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-6 rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] backdrop-blur-xl shadow-[0_0_20px_rgba(0,245,212,0.05)] lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-full items-center justify-between px-5 text-sm font-medium text-[#f1f5f9]"
        aria-expanded={open}
      >
        <span>{t('info.infoToggle')}</span>
        <ChevronDown
          className="h-4 w-4 text-[#64748b] transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '600px' : '0px' }}
      >
        <div className="border-t border-[#ffffff0d] p-5">
          <StakeInfoPanelContent />
        </div>
      </div>
    </div>
  )
}
