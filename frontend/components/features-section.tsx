'use client'

import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LazyDotLottieAnimation } from '@/components/lazy-dot-lottie'

export function FeaturesSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-[#0d0d14]/82 px-6 pb-6 pt-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0d0d14]/72 md:px-10 md:pb-10 md:pt-4">
        {/* 右上半圆（带填充），约 1/2 显示在卡片内 */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full opacity-55 md:-right-44 md:-top-44 md:h-96 md:w-96"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(0,245,212,0.34), rgba(0,245,212,0.03) 55%, rgba(0,245,212,0) 70%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full border border-[#00f5d4]/22 opacity-78 md:-right-44 md:-top-44 md:h-96 md:w-96"
          style={{
            boxShadow: '0 0 56px rgba(0,245,212,0.16), inset 0 0 38px rgba(0,245,212,0.09)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto mt-1 h-[280px] w-full max-w-4xl overflow-hidden md:mt-2 md:h-[380px]">
          <LazyDotLottieAnimation
            src="/稳定币0.lottie"
            autoplay
            loop
            speed={1}
            className={[
              'absolute left-1/2 top-0 z-10 h-full -translate-x-1/2',
              'w-[96%] max-w-none md:w-[112%]',
              'flex items-start justify-center',
              'origin-top [&_canvas]:origin-top [&_svg]:origin-top',
              '[&_canvas]:mx-auto [&_svg]:mx-auto',
              '[&_canvas]:scale-100 [&_svg]:scale-100 md:[&_canvas]:scale-[1.08] md:[&_svg]:scale-[1.08]',
              '[&_canvas]:h-full [&_svg]:h-full [&_canvas]:w-full [&_svg]:w-full',
            ].join(' ')}
          />
        </div>

        <div className="relative mt-3 max-w-3xl text-left md:mt-4">
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-[28px] font-extrabold leading-tight text-[#f1f5f9] md:text-[34px]">
            <span className="block md:inline">{t('home.homeFeatureTitleLine1')}</span>
            <span className="block md:ml-2 md:inline">{t('home.homeFeatureTitleLine2')}</span>
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#64748b] md:text-[15px]">
            {t('home.homeFeatureLeadBefore')}
            <code className="mx-0.5 rounded-md border border-[#ffffff14] bg-[#13131e] px-1.5 py-0.5 font-mono text-[12px] text-[#94a3b8]">
              swap
            </code>
            {t('home.homeFeatureLeadAfter')}
          </p>
        </div>

        <ul className="relative mt-6 max-w-2xl space-y-2.5 text-left text-[13px] leading-relaxed text-[#94a3b8] md:mt-8">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeFeatureBullet1')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeFeatureBullet2')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeFeatureBullet3')}
          </li>
        </ul>

        <div className="relative mt-8 flex md:mt-10">
          <Link
            href="https://rwa.lat/swap"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#00f5d4] px-8 py-4 text-base font-extrabold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.2)] transition-all hover:scale-[1.01] hover:brightness-110"
          >
            {t('home.homeFeatureCta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
