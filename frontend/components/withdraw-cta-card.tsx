'use client'

import Link from 'next/link'
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

export function WithdrawCtaCard({ className }: { className?: string }) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <TrustHighlightCardShell className={className}>
      <h3 className="shrink-0 text-left text-2xl font-extrabold text-white sm:text-3xl">
        {t('home.homeWithdrawCardTitle')}
      </h3>

      <div className={TRUST_CARD_BODY_GRID}>
        <div className={TRUST_TEXT_COL}>
          <div className={TRUST_BULLET_CENTER_WRAP}>
            <ul className={TRUST_BULLET_UL}>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeWithdrawBullet1')}</span>
              </li>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeWithdrawBullet2')}</span>
              </li>
              <li className={TRUST_BULLET_LI}>
                <span className={TRUST_BULLET_MARK} aria-hidden />
                <span className="min-w-0 break-words">{t('home.homeWithdrawBullet3')}</span>
              </li>
            </ul>
          </div>

          <div className="flex shrink-0 justify-start">
            <Link href="/withdraw" className={TRUST_CARD_HERO_CTA_CLASS}>
              {t('home.homeWithdrawCta')}
            </Link>
          </div>
        </div>

        <div className={TRUST_LOTTIE_COL}>
          <div className={TRUST_LOTTIE_INNER}>
            <LazyDotLottieAnimation
              src="/QIANBAO.lottie"
              className="h-full min-h-0 w-full"
              autoplay
              loop
              speed={1.15}
            />
          </div>
        </div>
      </div>
    </TrustHighlightCardShell>
  )
}
