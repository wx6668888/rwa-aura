'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface TimeRangeSelectorProps {
  value: '7d' | '30d' | '90d' | '180d' | 'all'
  onChange: (value: '7d' | '30d' | '90d' | '180d' | 'all') => void
}

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  
  const options: Array<'7d' | '30d' | '90d' | '180d' | 'all'> = ['7d', '30d', '90d', '180d', 'all']

  return (
    <div className="mt-4 sm:mt-6 flex justify-center px-4 sm:px-6">
      <div className="inline-flex gap-1 sm:gap-2 p-1 rounded-full bg-[#0d0d14]/50 border border-[#ffffff0d] overflow-x-auto max-w-full">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              px-4 sm:px-6 h-8 sm:h-9 rounded-full text-[12px] sm:text-[13px] font-medium transition-all duration-200 whitespace-nowrap
              ${value === option
                ? 'bg-[#00f5d4] text-[#05050a] shadow-lg shadow-[#00f5d440]'
                : 'text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
              }
            `}
          >
            {t(`analytics.${option}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
