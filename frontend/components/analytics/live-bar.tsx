'use client'

import { RefreshCw } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export default function LiveBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [seconds, setSeconds] = useState(5)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => (prev >= 60 ? 5 : prev + 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full border-b border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-auto sm:h-11 py-2 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[#10b981] font-medium">
            {t('analytics.live')}
          </span>
          <span className="text-[11px] sm:text-[12px] text-[#64748b]">
            {t('analytics.liveSource')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[#64748b]">
          <span>{t('analytics.lastUpdate')}: {seconds}{t('analytics.secondsAgo')}</span>
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>
    </div>
  )
}
