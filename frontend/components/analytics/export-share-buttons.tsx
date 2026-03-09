'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { FileDown, ExternalLink, Share2 } from 'lucide-react'

export default function ExportShareButtons() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const handleExportCsv = () => {
    // TODO: Implement CSV export
    console.log('Export CSV')
  }

  const handleVerifyBscscan = () => {
    window.open('https://bscscan.com', '_blank')
  }

  const handleShareReport = () => {
    // TODO: Implement share functionality
    console.log('Share report')
  }

  return (
    <div className="text-center">
      <p className="text-[12px] text-[#64748b]">
        {t('analytics.exportNote')}
      </p>
      
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-full border border-[#ffffff1a] text-[#f1f5f9] text-[13px] font-medium hover:bg-[#13131e] transition-all duration-200"
        >
          <FileDown className="w-4 h-4" />
          {t('analytics.exportCsv')}
        </button>
        
        <button
          onClick={handleVerifyBscscan}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-full border border-[#ffffff1a] text-[#00f5d4] text-[13px] font-medium hover:bg-[#13131e] transition-all duration-200"
        >
          <ExternalLink className="w-4 h-4" />
          {t('analytics.bscscan')}
        </button>
        
        <button
          onClick={handleShareReport}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-full border border-[#ffffff1a] text-[#f1f5f9] text-[13px] font-medium hover:bg-[#13131e] transition-all duration-200"
        >
          <Share2 className="w-4 h-4" />
          {t('analytics.shareReport')}
        </button>
      </div>
    </div>
  )
}
