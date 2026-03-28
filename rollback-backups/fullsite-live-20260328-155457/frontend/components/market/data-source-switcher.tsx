'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function DataSourceSwitcher() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live')

  return (
    <div className="border-b border-[#ffffff0d] bg-[#05050a] px-6 py-3">
      <div className="mx-auto flex max-w-7xl flex-col items-end gap-3 sm:flex-row sm:justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDataSource('live')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              dataSource === 'live'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'bg-[#1a1a2e] text-[#64748b] hover:bg-[#13131e]'
            }`}
          >
            {t('market.pancakeswapLive')}
          </button>
          <button
            onClick={() => setDataSource('mock')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              dataSource === 'mock'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'bg-[#1a1a2e] text-[#64748b] hover:bg-[#13131e]'
            }`}
          >
            {t('market.mockData')}
          </button>
        </div>
        <span className={`text-[11px] ${dataSource === 'live' ? 'text-[#334155]' : 'text-[#fb923c]'}`}>
          {dataSource === 'live' ? t('market.liveNote') : t('market.mockNote')}
        </span>
      </div>
    </div>
  )
}
