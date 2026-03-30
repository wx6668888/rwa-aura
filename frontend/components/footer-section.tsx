'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, Mail } from 'lucide-react'
import { bsc } from 'wagmi/chains'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES, bscscanAddressUrl } from '@/lib/contracts/addresses'
import { shortenAddress } from '@/lib/stats-display'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'rwacoin001@gmail.com'

export function FooterSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)

  const stakingAddress = CONTRACT_ADDRESSES[bsc.id].stakingContract
  const short = useMemo(() => shortenAddress(stakingAddress), [stakingAddress])
  const explorerUrl = bscscanAddressUrl(stakingAddress)

  function handleCopy() {
    navigator.clipboard.writeText(stakingAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const linkClass =
    'text-[12px] text-[#94a3b8] transition-colors hover:text-[#00f5d4] sm:text-[13px]'

  return (
    <footer className="mt-20 border-t border-[#ffffff0d] pb-10 pt-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 lg:px-8">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[#ffffff0d] pb-6"
          aria-label="Footer links"
        >
          <Link href="/terms" className={linkClass}>
            {t('footer.linkTerms')}
          </Link>
          <Link href="/privacy" className={linkClass}>
            {t('footer.linkPrivacy')}
          </Link>
          <Link href="/privacy#clauses" className={linkClass}>
            {t('footer.linkPrivacyClauses')}
          </Link>
          <Link href="/help" className={linkClass}>
            {t('footer.linkHelp')}
          </Link>
          <Link href="/knowledge" className={linkClass}>
            {t('footer.linkKnowledge')}
          </Link>
          <Link href="/security" className={linkClass}>
            {t('footer.linkSecurity')}
          </Link>
          <Link href="/about" className={linkClass}>
            {t('footer.linkAbout')}
          </Link>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 text-[12px] text-[#94a3b8] transition-colors hover:text-[#00f5d4] sm:text-[13px]"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-[#64748b]" aria-hidden />
            <span className="text-[#64748b]">{t('footer.emailLabel')}:</span>
            <span className="font-mono text-[#e2e8f0]">{CONTACT_EMAIL}</span>
          </a>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-[family-name:var(--font-space-grotesk)] text-base font-bold">
              <span className="text-[#00f5d4]">RWA</span>
              <span className="mx-2 inline-block h-3 w-px bg-[#ffffff1a] align-middle" />
              <span className="text-sm tracking-wider text-[#64748b]">PROTOCOL</span>
            </span>
            <span className="text-[12px] text-[#64748b]">{t('footer.copyright')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[#64748b]">{t('footer.contractLabel')}</span>
            <span className="font-mono text-[12px] text-[#f1f5f9]">{short}</span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="复制合约地址"
              className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在 BSCScan 查看合约"
              className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
