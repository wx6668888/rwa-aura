'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useHomepageStats } from '@/hooks/useHomepageStats'
import { formatUsdAmount } from '@/lib/stats-display'
import { RotatingLabels } from '@/components/rotating-labels'
import Link from 'next/link'

/** 地球视频：全端统一 planet.mp4（不用 planet_compressed / planet-mobile 等压缩转码，避免偏暗） */
const HERO_PLANET_MP4 = '/videos/planet.mp4'
const MOBILE_MAX_WIDTH = '(max-width: 1023px)'
/** 手机端地球随滚动上移（视差），不再用透明度淡出（避免像被渐变「盖住」） */
const MOBILE_PARALLAX = 0.32

/** 主标题 display（左下大标题） */
const heroDisplay =
  'font-[family-name:var(--font-space-grotesk)] text-[clamp(2rem,6.5vw,3.75rem)] font-bold leading-[0.92] tracking-[-0.03em]'

export function HeroSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reducedMotion = usePrefersReducedMotion()
  const stats = useHomepageStats()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MOBILE_MAX_WIDTH)
    const tick = () => {
      if (!mq.matches) {
        setScrollY(0)
        return
      }
      setScrollY(window.scrollY)
    }
    tick()
    window.addEventListener('scroll', tick, { passive: true })
    mq.addEventListener('change', tick)
    return () => {
      window.removeEventListener('scroll', tick)
      mq.removeEventListener('change', tick)
    }
  }, [])

  const mobileParallaxY = scrollY * MOBILE_PARALLAX
  const tvlText = formatUsdAmount(stats.tvlUsdt)
  const lead = t('hero.lead').trim()
  const statsNote = t('hero.statsNote').trim()

  return (
    <section className="relative flex flex-col overflow-x-hidden max-lg:min-h-[100dvh] max-lg:overflow-hidden lg:min-h-[min(76vh,620px)]">
      <div className="pointer-events-none absolute inset-0">
        {reducedMotion ? (
          <div
            className="h-full w-full bg-[#050a14]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 85% 65% at 50% 38%, rgba(0,90,100,0.5), transparent 58%)',
            }}
            aria-hidden
          />
        ) : (
          <>
            <div
              className="absolute inset-0 will-change-transform lg:hidden"
              style={{ transform: `translate3d(0, ${-mobileParallaxY}px, 0)` }}
              aria-hidden
            >
              <video
                className="h-full w-full object-cover object-[50%_42%] opacity-100 [filter:brightness(1.14)_contrast(1.06)_saturate(1.05)]"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              >
                <source src={HERO_PLANET_MP4} type="video/mp4" />
              </video>
            </div>
            <div className="absolute inset-0 hidden lg:block" aria-hidden>
              <video
                className="h-full w-full object-cover object-[50%_45%] opacity-[0.96]"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              >
                <source src={HERO_PLANET_MP4} type="video/mp4" />
              </video>
            </div>
          </>
        )}
      </div>
      {/* 手机端遮罩更轻，避免地球发灰；桌面保持略深以托住文案 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/22 via-black/10 to-[#05070d]/78 lg:from-black/36 lg:via-black/20 lg:to-[#05070d]/88" />

      {/* 文案贴视口左下：不用 mx-auto 居中栏，避免宽屏上整块落在中间/偏右 */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-start justify-end px-4 pb-14 pt-28 sm:px-6 lg:px-10 lg:pb-16 lg:pt-28">
        <div
          dir="ltr"
          className="max-w-[min(100%,36rem)] text-left sm:max-w-xl"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#9ca8b8] sm:text-sm sm:tracking-[0.26em]">
            {t('hero.kicker')}
          </p>

          <h1 className="mt-4 flex flex-wrap items-baseline justify-start gap-x-[0.35em] gap-y-1 text-left sm:mt-5">
            <span className={`${heroDisplay} text-plasma-cyan`}>{t('hero.real')}</span>
            <span className="inline-flex min-h-[1em] max-w-full items-baseline justify-start text-left text-white">
              <RotatingLabels variant="hero" />
            </span>
          </h1>

          {lead ? (
            <p className="mt-4 text-[15px] leading-[1.65] text-[#9fb0c9] sm:mt-5 sm:text-[17px] sm:leading-relaxed">
              {lead}
            </p>
          ) : null}

          {/* 单行细字：0.8% + 标签 | TVL + 标签 */}
          <div className="mt-6 flex flex-col items-start gap-1 sm:mt-7">
            <div className="flex max-w-full flex-row flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-[11px] font-extralight leading-tight text-[#9fb0c9] sm:gap-x-2 sm:text-xs">
              <span className="font-light tabular-nums text-white/90">0.8%</span>
              <span className="font-extralight opacity-85">{t('hero.pillDailyLabel')}</span>
              <span className="px-0.5 font-light text-white/20" aria-hidden>
                |
              </span>
              <span className="font-light tabular-nums text-white/90">{tvlText}</span>
              <span className="font-extralight opacity-85">{t('hero.pillTvlLabel')}</span>
            </div>
            {statsNote ? (
              <p className="max-w-sm text-left text-[10px] font-extralight leading-snug text-[#5c6b7c] sm:text-[11px]">
                {statsNote}
              </p>
            ) : null}
          </div>

          <div className="mt-7 flex justify-start sm:mt-8">
            <Link
              href="/stake"
              className="inline-flex rounded-full bg-plasma-cyan px-7 py-2.5 text-[15px] font-semibold text-void-black transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 sm:px-8 sm:py-3 sm:text-base"
            >
              {t('hero.cta1')}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[12px] font-normal tracking-wide text-[#8b9cb4] sm:mt-7 sm:text-[13px]">
            <span>{t('hero.trustChip1')}</span>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <span>{t('hero.trustChip2')}</span>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <span>{t('hero.trustChip3')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
