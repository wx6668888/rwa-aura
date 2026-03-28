'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const partners = [
  {
    id: 'audit',
    key: 'security.trustedAudit',
    company: 'SlowMist',
  },
  {
    id: 'platform',
    key: 'security.trustedPlatform',
    company: 'Binance',
  },
  {
    id: 'partner',
    key: 'security.trustedPartner',
    company: 'Chainlink',
  },
  {
    id: 'media',
    key: 'security.trustedMedia',
    company: 'CoinDesk',
  },
  {
    id: 'investor',
    key: 'security.trustedInvestor',
    company: 'a16z',
  },
]

export function TrustedBy() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-16 border-t border-[#ffffff0d] py-12">
      <p
        className="text-center text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.trustedBy')}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-12">
        {partners.map((partner) => (
          <div key={partner.id} className="text-center">
            <div className="flex h-10 min-w-[100px] items-center justify-center rounded-lg border border-[#ffffff0d] bg-[#13131e] px-4 opacity-60 transition-all hover:border-[#00f5d4]/30 hover:opacity-100 sm:min-w-[120px]">
              <span className="text-[11px] font-semibold text-[#f1f5f9] sm:text-xs">
                {partner.company}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">
              {t(partner.key)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
