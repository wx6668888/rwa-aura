'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function SystemConfig() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
        <h2 className="mb-4 text-lg font-semibold text-[#f1f5f9]">
          {t('admin.config.title') || '系统配置'}
        </h2>
        <p className="text-sm text-[#64748b]">
          {t('admin.config.comingSoon') || '系统配置功能即将推出'}
        </p>
      </div>
    </div>
  )
}
