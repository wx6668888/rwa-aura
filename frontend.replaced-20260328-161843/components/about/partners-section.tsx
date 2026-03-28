'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function PartnersSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const categories = [
    {
      label: t('about.partnersCat1'),
      partners: [
        { name: 'SlowMist', abbr: 'SM' },
        { name: 'CertiK', abbr: 'CK' },
        { name: 'PeckShield', abbr: 'PS' },
      ],
    },
    {
      label: t('about.partnersCat2'),
      partners: [
        { name: 'BNB Chain', abbr: 'BSC' },
        { name: 'Chainlink', abbr: 'CL' },
        { name: 'Gnosis Safe', abbr: 'GS' },
        { name: 'PancakeSwap', abbr: 'PCS' },
      ],
    },
    {
      label: t('about.partnersCat3'),
      partners: [
        { name: 'a16z', abbr: 'a16z' },
        { name: 'Paradigm', abbr: 'PRD' },
        { name: 'Binance Labs', abbr: 'BL' },
      ],
    },
    {
      label: t('about.partnersCat4'),
      partners: [
        { name: 'CoinDesk', abbr: 'CD' },
        { name: 'CoinTelegraph', abbr: 'CT' },
        { name: 'BlockBeats', abbr: 'BB' },
        { name: t('about.media4'), abbr: '' },
      ],
    },
  ]

  return (
    <section className="px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('about.partnersLabel')}
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold text-[#f1f5f9]">
            {t('about.partnersTitle')}
          </h2>
        </div>

        {/* Partner categories */}
        <div className="space-y-10">
          {categories.map((category, i) => (
            <div key={i}>
              {/* Category label */}
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                {category.label}
              </div>

              {/* Logo row */}
              <div className="flex flex-wrap items-center justify-center gap-8 lg:justify-start">
                {category.partners.map((partner, j) => (
                  <div
                    key={j}
                    className="flex h-[60px] w-[160px] items-center justify-center rounded-xl border border-[#ffffff0d] bg-[#13131e] opacity-60 transition-all hover:border-[#ffffff1a] hover:opacity-100"
                  >
                    <div className="text-center">
                      {partner.abbr && (
                        <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#00f5d4]">
                          {partner.abbr}
                        </span>
                      )}
                      <span className="ml-2 text-sm font-medium text-[#f1f5f9]">
                        {partner.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
