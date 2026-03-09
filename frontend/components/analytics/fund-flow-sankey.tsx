'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { ArrowRight, TrendingUp } from 'lucide-react'

export default function FundFlowSankey() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00f5d410] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <div className="text-[17px] font-bold text-[#f1f5f9]">
              {t('analytics.fundFlow')}
            </div>
            <div className="text-[13px] text-[#64748b] mt-0.5">
              {t('analytics.periodTotal')} <span className="font-mono font-bold text-[#00f5d4]">$2,340,000</span> USDT
            </div>
          </div>
        </div>
      </div>

      {/* Modern Flow Diagram */}
      <div className="relative">
        {/* Source Node */}
        <div className="flex justify-center mb-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00f5d4] rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative px-8 py-6 rounded-2xl border-2 border-[#00f5d4] bg-[#0d0d14] backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-wider text-[#64748b] mb-2 text-center">
                {t('analytics.userStaking')}
              </div>
              <div className="text-[32px] font-mono font-black text-[#00f5d4] text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                $2.34M
              </div>
              <div className="text-[11px] text-[#64748b] text-center mt-1">
                100%
              </div>
            </div>
          </div>
        </div>

        {/* Split Arrows */}
        <div className="flex justify-center gap-32 mb-12 relative">
          {/* Left Arrow */}
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-16 bg-gradient-to-b from-[#00f5d4] to-transparent" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#13131e] border border-[#ffffff0d]">
              <ArrowRight className="w-4 h-4 text-[#64748b]" />
              <span className="text-[12px] font-mono font-bold text-[#64748b]">50%</span>
            </div>
          </div>

          {/* Right Arrow */}
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-16 bg-gradient-to-b from-[#00f5d4] to-transparent" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#13131e] border border-[#ffffff0d]">
              <ArrowRight className="w-4 h-4 text-[#00f5d4]" />
              <span className="text-[12px] font-mono font-bold text-[#00f5d4]">50%</span>
            </div>
          </div>
        </div>

        {/* Destination Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Treasury */}
          <div className="relative group">
            <div className="absolute inset-0 bg-[#64748b] rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative p-6 rounded-2xl border border-[#ffffff1a] bg-[#13131e] backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[13px] uppercase tracking-wider text-[#64748b] mb-1">
                    {t('analytics.treasury')}
                  </div>
                  <div className="text-[24px] font-mono font-bold text-[#f1f5f9]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    $1.17M
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#64748b20] text-[#64748b] text-[11px] font-bold">
                  50%
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
                <div className="w-2 h-2 rounded-full bg-[#64748b]" />
                {t('analytics.gnosisSafe')}
              </div>
            </div>
          </div>

          {/* Community Pool */}
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00f5d4] rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative p-6 rounded-2xl border border-[#00f5d420] bg-[#13131e] backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[13px] uppercase tracking-wider text-[#00f5d4] mb-1">
                    {t('analytics.communityPool')}
                  </div>
                  <div className="text-[24px] font-mono font-bold text-[#00f5d4]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    $1.17M
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#00f5d420] text-[#00f5d4] text-[11px] font-bold">
                  50%
                </div>
              </div>
              
              {/* Distribution from Community Pool */}
              <div className="mt-4 pt-4 border-t border-[#ffffff0d] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00f5d4]" />
                    <span className="text-[12px] text-[#64748b]">{t('analytics.staticYield')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-[#64748b]" />
                    <span className="text-[11px] text-[#00f5d4]">{t('analytics.toStakers')}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                    <span className="text-[12px] text-[#64748b]">{t('analytics.referralBonus')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-[#64748b]" />
                    <span className="text-[11px] text-[#8b5cf6]">{t('analytics.toReferrers')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#13131e] border border-[#ffffff0d]">
            <div className="text-[11px] uppercase tracking-wider text-[#64748b] mb-2">
              {t('analytics.treasury')}
            </div>
            <div className="text-[14px] font-medium text-[#f1f5f9]">
              {t('analytics.longTermReserve')}
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              {t('analytics.multiSigProtected')}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#13131e] border border-[#ffffff0d]">
            <div className="text-[11px] uppercase tracking-wider text-[#00f5d4] mb-2">
              {t('analytics.staticYield')}
            </div>
            <div className="text-[14px] font-medium text-[#f1f5f9]">
              {t('analytics.dailyYield')}
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              {t('analytics.autoDistributed')}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#13131e] border border-[#ffffff0d]">
            <div className="text-[11px] uppercase tracking-wider text-[#8b5cf6] mb-2">
              {t('analytics.referralBonus')}
            </div>
            <div className="text-[14px] font-medium text-[#f1f5f9]">
              {t('analytics.tieredRewards')}
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              {t('analytics.v1v5Levels')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
