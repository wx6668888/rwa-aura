'use client'

import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LazyDotLottieAnimation } from '@/components/lazy-dot-lottie'

export function HowItWorksSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="relative overflow-visible rounded-3xl border border-white/14 bg-[#0d0d14]/82 px-6 pb-6 pt-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0d0d14]/72 md:overflow-hidden md:px-10 md:pb-10 md:pt-4">
        {/* 左下半圆（带填充），约 1/2 显示在卡片内 */}
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-55 md:-bottom-44 md:-left-44 md:h-96 md:w-96"
          style={{
            background: 'radial-gradient(circle at 65% 65%, rgba(0,245,212,0.34), rgba(0,245,212,0.03) 55%, rgba(0,245,212,0) 70%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full border border-[#00f5d4]/22 opacity-78 md:-bottom-44 md:-left-44 md:h-96 md:w-96"
          style={{
            boxShadow: '0 0 56px rgba(0,245,212,0.16), inset 0 0 38px rgba(0,245,212,0.09)',
          }}
          aria-hidden
        />

        {/* 移动端：拉满卡片可视宽度 + 不加 overflow-hidden，避免 network 插画左右被裁 */}
        <div className="relative -mx-6 -mt-2 h-[360px] w-[calc(100%+3rem)] max-w-none overflow-visible px-0 md:mx-auto md:-mt-1 md:h-[380px] md:w-full md:max-w-4xl md:overflow-hidden">
          <LazyDotLottieAnimation
            src="/network.lottie"
            autoplay
            loop
            speed={1}
            className={[
              'absolute left-1/2 top-0 z-10 flex h-full w-[min(104%,480px)] -translate-x-1/2 items-start justify-center',
              'max-md:w-[min(100%,calc(100vw-2rem))] max-md:max-w-[480px]',
              'md:w-[120%] md:max-w-none',
              'origin-top [&_canvas]:origin-top [&_svg]:origin-top',
              '[&_canvas]:mx-auto [&_svg]:mx-auto',
              'max-md:[&_canvas]:-translate-y-[4%] max-md:[&_svg]:-translate-y-[4%] max-md:[&_canvas]:scale-[1] max-md:[&_svg]:scale-[1]',
              'md:[&_canvas]:-translate-y-[8%] md:[&_svg]:-translate-y-[8%] md:[&_canvas]:scale-[1.12] md:[&_svg]:scale-[1.12]',
              '[&_canvas]:h-full [&_svg]:h-full [&_canvas]:w-full [&_svg]:w-full',
            ].join(' ')}
          />
        </div>

        <h2 className="relative mt-3 text-left font-[family-name:var(--font-space-grotesk)] text-[28px] font-extrabold leading-tight text-[#f1f5f9] md:text-[34px]">
          {t('home.homeReferralTitle')}
        </h2>
        <p className="relative mt-3 max-w-2xl text-left text-[14px] leading-relaxed text-[#64748b] md:text-[15px]">
          {t('home.homeReferralLead')}
        </p>

        <ul className="relative mx-auto mt-8 max-w-2xl space-y-2.5 text-left text-[13px] leading-relaxed text-[#94a3b8] md:mt-10">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeReferralBullet1')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeReferralBullet2')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            {t('home.homeReferralBullet3')}
          </li>
        </ul>

        <div className="relative mt-8 flex md:mt-10">
          <Link
            href="https://rwa.lat/node/network"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#00f5d4] px-8 py-4 text-base font-extrabold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.2)] transition-all hover:scale-[1.01] hover:brightness-110"
          >
            {t('home.homeReferralCta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
