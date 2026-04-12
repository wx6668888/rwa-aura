'use client'

import { CheckCircle } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

function VerifiedTag({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-center gap-1">
      <CheckCircle className="h-2.5 w-2.5 text-[#10b981]" />
      <span className="text-[10px] text-[#10b981]">{label}</span>
    </div>
  )
}

export function ProtocolParams() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section>
      <p className="text-[13px] font-semibold uppercase tracking-widest text-[#64748b]">
        {t('gov.paramsTitle')}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card 1: Daily Yield */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-5 backdrop-blur-xl transition-colors hover:border-[#ffffff1a]">
          <p className="font-[family-name:var(--font-mono)] text-[28px] font-bold text-[#00f5d4]">0.8%</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.dailyYield')}</p>
          <VerifiedTag label={t('gov.onChainVerified')} />
        </div>

        {/* Card 2: Sell Tax（ headline 与兑换/市场页一致；细项以知识库「动态卖出税」为准） */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-5 backdrop-blur-xl transition-colors hover:border-[#ffffff1a]">
          <p className="font-[family-name:var(--font-mono)] text-[28px] font-bold leading-tight text-[#00f5d4]">
            {t('gov.sellTaxHeadline')}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.sellTax')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#1a1a2e] px-2.5 py-1 text-[11px] text-[#64748b]">
              {t('gov.taxTreasury')}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] text-[#f43f5e]" style={{ background: 'rgba(244,63,94,0.1)' }}>
              {t('gov.taxBurn')}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] text-[#8b5cf6]" style={{ background: 'rgba(139,92,246,0.1)' }}>
              {t('gov.taxLiquidity')}
            </span>
          </div>
          <VerifiedTag label={t('gov.onChainVerified')} />
        </div>

        {/* Card 3: Min Stake */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-5 backdrop-blur-xl transition-colors hover:border-[#ffffff1a]">
          <p className="font-[family-name:var(--font-mono)] text-[28px] font-bold text-[#00f5d4]">100 USDT</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.minStake')}</p>
          <VerifiedTag label={t('gov.onChainVerified')} />
        </div>

        {/* Card 4: Cooldown */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-5 backdrop-blur-xl transition-colors hover:border-[#ffffff1a]">
          <p className="font-[family-name:var(--font-mono)] text-[28px] font-bold text-[#00f5d4]">24 {locale === 'zh' ? '小时' : 'hrs'}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.cooldown')}</p>
          <VerifiedTag label={t('gov.onChainVerified')} />
        </div>
      </div>
    </section>
  )
}
