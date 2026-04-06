'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LazyDotLottieAnimation } from '@/components/lazy-dot-lottie'
import { TrustHighlightCardShell } from '@/components/trust-highlight-card-shell'
import {
  TRUST_BULLET_CENTER_WRAP,
  TRUST_BULLET_LI,
  TRUST_BULLET_MARK,
  TRUST_BULLET_UL,
  TRUST_CARD_BODY_GRID,
  TRUST_CARD_HERO_CTA_CLASS,
  TRUST_LOTTIE_COL,
  TRUST_LOTTIE_INNER,
  TRUST_TEXT_COL,
} from '@/lib/trust-highlight-cards'

export function SecurityTransparencyCard({ className }: { className?: string }) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <TrustHighlightCardShell className={className}>
      <style jsx global>{`
        @keyframes security-swipe-hint {
          0%,
          100% {
            opacity: 0.65;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(4px);
          }
        }
      `}</style>
      {/* 窄屏：右上角滑动提示（更明显） */}
      <div
        className="pointer-events-none absolute right-2 top-2 z-30 hidden max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-[#00f5d4]/55 bg-[#03080c]/92 px-2.5 py-1.5 text-[11px] font-semibold leading-tight text-[#00f5d4] shadow-[0_0_22px_rgba(0,245,212,0.22)] backdrop-blur-md sm:right-3 sm:top-3 sm:gap-2 sm:px-3 sm:py-2 sm:text-[12px] max-lg:flex"
        aria-hidden
      >
        <span className="max-w-[10rem] sm:max-w-[12rem]">{t('home.trustCardsSwipeHint')}</span>
        <div className="flex shrink-0 flex-col -space-y-1 motion-safe:animate-[security-swipe-hint_2.2s_ease-in-out_infinite]">
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} />
          <ChevronRight className="h-3.5 w-3.5 text-[#00f5d4]/80 sm:h-4 sm:w-4" strokeWidth={2.2} />
        </div>
      </div>

      <h3 className="shrink-0 pr-[min(8.5rem,32%)] text-left text-2xl font-extrabold text-white sm:pr-[9.5rem] sm:text-3xl lg:pr-0">
        {t('home.homeSecurityCardTitle')}
      </h3>

      <div className={TRUST_CARD_BODY_GRID}>
        <div className={TRUST_TEXT_COL}>
          <div className={TRUST_BULLET_CENTER_WRAP}>
            <ul className={TRUST_BULLET_UL}>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeSecurityBullet1')}</span>
              </li>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeSecurityBullet2')}</span>
              </li>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeSecurityBullet3')}</span>
              </li>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeSecurityBullet4')}</span>
              </li>
            </ul>
          </div>

          <div className="flex shrink-0 justify-start">
            <Link href="/security" className={TRUST_CARD_HERO_CTA_CLASS}>
              {t('home.homeSecurityCta')}
            </Link>
          </div>
        </div>

        <div className={TRUST_LOTTIE_COL}>
          <div className={TRUST_LOTTIE_INNER}>
            <LazyDotLottieAnimation
              src="/shouyes.lottie"
              className="h-full min-h-0 w-full"
              autoplay
              loop
              speed={1.35}
            />
          </div>
        </div>
      </div>
    </TrustHighlightCardShell>
  )
}
