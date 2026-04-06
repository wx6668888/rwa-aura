'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUp, Check, Copy, ExternalLink, Send, Twitter } from 'lucide-react'
import { bsc } from 'wagmi/chains'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES, SITE_EXTERNAL, bscscanAddressUrl } from '@/lib/contracts/addresses'
import { shortenAddress } from '@/lib/stats-display'
import { HomeFixedRwaReveal } from '@/components/home-fixed-rwa-reveal'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'rwacoin001@gmail.com'

/** 站点主色（与导航/按钮一致） */
const BRAND = '#00f5d4'

/** 首页页脚 + 底部 RWA.LAT 条（portal；近底一段滚动距离内平滑显现/收起，避免闪现） */
export function FooterSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)
  /** 底部 RWA.LAT 条显示进度 0～1：在接近文档末尾一段距离内平滑变化，避免贴底瞬间闪现 */
  const [rwaStripProgress, setRwaStripProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const root = document.documentElement
      const y = window.scrollY
      const innerH = window.innerHeight
      const scrollH = Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0)
      const maxScroll = Math.max(0, scrollH - innerH)
      const remaining = maxScroll - y

      const endZone = Math.min(520, Math.max(280, innerH * 0.5))
      let next: number
      if (remaining >= endZone) next = 0
      else next = 1 - remaining / endZone
      setRwaStripProgress(Math.max(0, Math.min(1, next)))
    }
    update()
    const timeoutId = window.setTimeout(update, 0)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const stakingAddress = CONTRACT_ADDRESSES[bsc.id].stakingContract
  const short = useMemo(() => shortenAddress(stakingAddress), [stakingAddress])
  const explorerUrl = bscscanAddressUrl(stakingAddress)

  function handleCopy() {
    navigator.clipboard.writeText(stakingAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const colTitle = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]'
  const colLink =
    'block text-[15px] font-semibold text-white transition-colors hover:text-[#00f5d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5d4]'

  return (
    <>
      <div className="mt-16 w-full bg-[#050508] text-white">
        <footer className="mx-auto max-w-7xl px-4 pt-14 pb-28 sm:pb-32 lg:px-8">
          <div className="border-b border-[#ffffff14] pb-12">
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {t('footer.homeCtaTitle')}
            </h2>
            <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[1.35rem] font-bold text-[#64748b] sm:text-2xl">
              {t('footer.homeCtaSubtitle')}
            </p>
            <Link
              href="/stake"
              aria-label={t('footer.homeCtaAria')}
              className="mt-8 flex w-full items-center justify-between gap-3 rounded-lg px-5 py-4 text-[15px] font-semibold text-[#05050a] transition-[filter] hover:brightness-95 active:brightness-90"
              style={{ backgroundColor: BRAND }}
            >
              <span>{t('footer.homeCtaButton')}</span>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#05050a]" aria-hidden />
            </Link>
          </div>

          <nav
            className="border-b border-[#ffffff14] py-12"
            aria-label={t('footer.navLinksAria')}
          >
            <div className="mb-10 flex items-center gap-3">
              <div
                role="img"
                aria-label={t('footer.brandMarkAria')}
                className="flex h-10 w-10 items-center justify-center gap-1 rounded-md"
                style={{ backgroundColor: BRAND }}
              >
                <span className="h-2 w-2 rounded-full bg-[#05050a]" aria-hidden />
                <span className="h-2 w-2 rounded-full bg-[#05050a]" aria-hidden />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3 md:gap-y-12">
              <div className="flex flex-col gap-4">
                <h3 className={colTitle}>{t('footer.colLegal')}</h3>
                <ul className="flex flex-col gap-3">
                  <li>
                    <Link href="/terms" className={colLink}>
                      {t('footer.linkTerms')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className={colLink}>
                      {t('footer.linkPrivacy')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy#clauses" className={colLink}>
                      {t('footer.linkPrivacyClauses')}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className={colTitle}>{t('footer.colResources')}</h3>
                <ul className="flex flex-col gap-3">
                  <li>
                    <Link href="/help" className={colLink}>
                      {t('footer.linkHelp')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/knowledge" className={colLink}>
                      {t('footer.linkKnowledge')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/security" className={colLink}>
                      {t('footer.linkSecurity')}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={`${colTitle} m-0`}>{t('footer.colConnect')}</h3>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <a
                      href={SITE_EXTERNAL.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-2 text-white transition-colors hover:text-[#00f5d4]"
                      aria-label="X (Twitter)"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a
                      href={SITE_EXTERNAL.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-2 text-white transition-colors hover:text-[#00f5d4]"
                      aria-label="Discord"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                      </svg>
                    </a>
                    <a
                      href={SITE_EXTERNAL.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-2 text-white transition-colors hover:text-[#00f5d4]"
                      aria-label="Telegram"
                    >
                      <Send className="h-5 w-5" />
                    </a>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  <li>
                    <Link href="/about" className={colLink}>
                      {t('footer.linkAbout')}
                    </Link>
                  </li>
                  <li>
                    <a href={`mailto:${CONTACT_EMAIL}`} className={colLink}>
                      {CONTACT_EMAIL}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          <div className="flex flex-col gap-6 pt-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-[#64748b]">{t('footer.copyright')}</span>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#64748b]">
                <span>{t('footer.contractLabel')}</span>
                <span className="font-mono text-[#e2e8f0]">{short}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={t('footer.copyContractAria')}
                  className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('footer.viewContractExplorerAria')}
                  className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={scrollTop}
              className="inline-flex items-center gap-2 self-start text-[13px] font-medium text-[#64748b] transition-colors hover:text-white sm:self-auto"
            >
              {t('footer.backToTop')}
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </footer>
      </div>
      <HomeFixedRwaReveal progress={rwaStripProgress} />
    </>
  )
}
