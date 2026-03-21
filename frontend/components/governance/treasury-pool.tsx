'use client'

import { ExternalLink } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function TreasuryPool() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const signers = [
    { label: t('gov.signer1'), addr: t('gov.signer1addr') },
    { label: t('gov.signer2'), addr: t('gov.signer2addr') },
    { label: t('gov.signer3'), addr: t('gov.signer3addr') },
  ]

  return (
    <section className="mt-8">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-[#64748b]">
        {t('gov.fundsTitle')}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Treasury Card — highlight */}
        <div
          className="rounded-xl border border-[#00f5d41a] bg-[#0d0d14] p-6 backdrop-blur-xl"
          style={{ boxShadow: '0 0 40px rgba(0,245,212,0.04) inset' }}
        >
          <p className="text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.treasury')}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[40px] font-bold leading-none text-[#00f5d4]">
              $6,225,000
            </span>
            <span className="font-[family-name:var(--font-mono)] text-lg text-[#00f5d4]">USDT</span>
          </div>

          {/* Address */}
          <div className="mt-3 flex items-center gap-2">
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#64748b]">
              {t('gov.treasuryAddr')}
            </span>
            <a
              href="https://bscscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#00f5d4] transition-colors hover:bg-[#00f5d41a]"
              aria-label="View on BSCScan"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Multisig tag */}
          <div className="mt-2 inline-flex items-center rounded-full border border-[#ffffff0d] bg-[#1a1a2e] px-3 py-1">
            <span className="text-[11px] text-[#64748b]">{t('gov.treasuryTag')}</span>
          </div>

          <div className="my-4 h-px bg-[#ffffff0d]" />

          {/* Signers */}
          <p className="text-[11px] uppercase tracking-wider text-[#334155]">{t('gov.signersLabel')}</p>
          <div className="mt-2 space-y-2">
            {signers.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">{s.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#334155]">{s.addr}</span>
                  <a
                    href="https://bscscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#64748b] hover:text-[#f1f5f9]"
                    aria-label="View signer on BSCScan"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Pool Card */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-6 backdrop-blur-xl transition-colors hover:border-[#ffffff1a]">
          <p className="text-[11px] uppercase tracking-wider text-[#64748b]">{t('gov.pool')}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[40px] font-bold leading-none text-[#00f5d4]">
              $2,450,000
            </span>
            <span className="font-[family-name:var(--font-mono)] text-lg text-[#00f5d4]">USDT</span>
          </div>

          {/* Pool health bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[#64748b]">
              <span>{t('gov.poolUsed')}</span>
              <span>{t('gov.poolHealth')}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1a1a2e]">
              <div
                className="h-full rounded-full bg-[#00f5d4] transition-all"
                style={{ width: '84%', boxShadow: '0 0 8px #00f5d440' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 space-y-2">
            <p className="text-[13px] text-[#64748b]">{t('gov.poolAvail')}</p>
            <p className="text-[13px] text-[#64748b]">{t('gov.poolTotal')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
