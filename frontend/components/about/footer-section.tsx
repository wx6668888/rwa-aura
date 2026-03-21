'use client'

import { useState, useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { Twitter, Send, MessageCircle, Github, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { bsc } from 'wagmi/chains'
import { CONTRACT_ADDRESSES, SITE_EXTERNAL, bscscanTokenUrl } from '@/lib/contracts/addresses'
import { shortenAddress } from '@/lib/stats-display'

export function FooterSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)

  const rwaAddress = CONTRACT_ADDRESSES[bsc.id].rwaToken
  const rwaShort = useMemo(() => shortenAddress(rwaAddress), [rwaAddress])
  const rwaExplorer = bscscanTokenUrl(rwaAddress)

  const copyRwa = () => {
    navigator.clipboard.writeText(rwaAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="border-t border-[#ffffff0d] px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Main grid - Hide detailed links on mobile */}
        <div className="hidden gap-8 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1 - Brand */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#00f5d4]">
                RWA
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
                PROTOCOL
              </span>
            </div>
            <p className="mt-2 text-[13px] text-[#64748b]">
              {t('about.footerTagline')}
            </p>
            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              <a
                href={SITE_EXTERNAL.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Telegram"
              >
                <Send className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Discord"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 2 - Products */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#334155]">
              {t('about.footerProducts')}
            </div>
            <div className="space-y-2">
              {[
                { label: t('nav.stake'), href: '/stake' },
                { label: t('nav.withdraw'), href: '/withdraw' },
                { label: t('nav.market'), href: '/market' },
                { label: t('nav.swap'), href: '/swap' },
                { label: t('nav.lucky'), href: '/lucky' },
                { label: t('nav.calculator'), href: '/calculator' },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="block text-[13px] text-[#64748b] transition-colors hover:text-[#00f5d4]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3 - Info */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#334155]">
              {t('about.footerInfo')}
            </div>
            <div className="space-y-2">
              {[
                { label: t('about.footerAbout'), href: '/about' },
                { label: t('nav.announcements'), href: '/announcements' },
                { label: t('nav.nodes'), href: '/nodes' },
                { label: t('nav.analytics'), href: '/analytics' },
                { label: t('nav.governance'), href: '/governance' },
                { label: t('nav.security'), href: '/security' },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="block text-[13px] text-[#64748b] transition-colors hover:text-[#00f5d4]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4 - Resources */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#334155]">
              {t('about.footerResources')}
            </div>
            <div className="space-y-2">
              {[
                t('about.footerWhitepaper'),
                t('about.footerDocs'),
                t('about.footerAudit'),
                t('about.footerBugBounty'),
                t('about.footerHelp'),
                t('about.footerContact'),
              ].map((label, i) => (
                <button
                  key={i}
                  className="block text-[13px] text-[#64748b] transition-colors hover:text-[#00f5d4]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile simplified footer */}
        <div className="sm:hidden">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#00f5d4]">
                RWA
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
                PROTOCOL
              </span>
            </div>
            <p className="mt-2 text-[13px] text-[#64748b]">
              {t('about.footerTagline')}
            </p>
            {/* Social icons */}
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={SITE_EXTERNAL.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Telegram"
              >
                <Send className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="Discord"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={SITE_EXTERNAL.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-[#ffffff0d] pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* Left */}
          <div className="text-xs text-[#334155]">
            {t('about.footerCopyright')}
          </div>

          {/* Center - Contract (hidden on mobile) */}
          <div className="hidden items-center gap-2 text-xs text-[#334155] sm:flex">
            <span>{t('about.footerContract')}</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#f1f5f9]">{rwaShort}</span>
            <button
              type="button"
              onClick={copyRwa}
              className="text-[#64748b] hover:text-[#00f5d4]"
              aria-label="复制 RWA 合约"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
            <a
              href={rwaExplorer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#64748b] hover:text-[#00f5d4]"
              aria-label="BscScan"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Right - Legal (simplified on mobile) */}
          <div className="flex gap-2 text-xs text-[#334155] sm:gap-3">
            <Link href="/privacy" className="hover:text-[#64748b] transition-colors">
              {t('about.footerPrivacy')}
            </Link>
            <span className="hidden sm:inline">·</span>
            <Link href="/terms" className="hover:text-[#64748b] transition-colors">
              {t('about.footerTerms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
