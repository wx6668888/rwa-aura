'use client'

import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useHomepageStats } from '@/hooks/useHomepageStats'
import { useCountUp } from '@/hooks/useCountUp'
import { formatUsdFull } from '@/lib/stats-display'
import { RotatingLabels } from '@/components/rotating-labels'
import Link from 'next/link'

const MOBILE_MAX_WIDTH = '(max-width: 1023px)'

/** 主标题 display（左下大标题） */
const heroDisplay =
  'font-[family-name:var(--font-space-grotesk)] text-[clamp(2rem,6.5vw,3.75rem)] font-bold leading-[0.92] tracking-[-0.03em]'

export function HeroSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reducedMotion = usePrefersReducedMotion()
  const stats = useHomepageStats()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MOBILE_MAX_WIDTH)
    let raf = 0

    const computeOpacity = () => {
      const y = window.scrollY
      const range = mq.matches ? 340 : Math.max(520, Math.min(900, Math.round(window.innerHeight * 0.9)))
      return Math.min(1, Math.max(0, y) / range)
    }

    const flush = () => {
      raf = 0
      const raw = computeOpacity()
      const quantized = Math.round(raw * 120) / 120
      document.documentElement.style.setProperty('--home-planet-cover', String(quantized))
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(flush)
    }

    flush()
    window.addEventListener('scroll', onScroll, { passive: true })
    mq.addEventListener('change', flush)
    return () => {
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', flush)
      if (raf) window.cancelAnimationFrame(raf)
      document.documentElement.style.removeProperty('--home-planet-cover')
    }
  }, [])
  const animatedTvl = useCountUp(stats.tvlUsdt, {
    durationMs: 1600,
    disabled: reducedMotion,
  })
  const tvlText = formatUsdFull(animatedTvl)
  const lead = t('hero.lead').trim()
  const marqueeA = t('hero.marqueeA')
  const marqueeB = t('hero.marqueeB')

  return (
    <section className="relative flex flex-col overflow-x-hidden max-lg:min-h-[100dvh] max-lg:overflow-hidden lg:min-h-[min(76vh,620px)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/22 via-black/10 to-[#05070d]/78 lg:from-black/36 lg:via-black/20 lg:to-[#05070d]/88" />

      {/* 文案贴视口左下：不用 mx-auto 居中栏，避免宽屏上整块落在中间/偏右 */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-start justify-end px-4 max-lg:-translate-y-[2.75rem] max-lg:pt-[calc(4.75rem+var(--app-safe-top))] max-lg:pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:translate-y-0 lg:px-10 lg:pb-16 lg:pt-28">
        <div
          dir="ltr"
          className="max-w-[min(100%,36rem)] text-left sm:max-w-xl"
        >
          <p className="text-left text-[11px] font-semibold tracking-[0.2em] text-[#9ca8b8] sm:text-[12px] sm:tracking-[0.24em]">
            {marqueeA}
            <span className="mx-1.5 font-normal text-white/35" aria-hidden>
              ·
            </span>
            {marqueeB}
          </p>

          <h1 className="mt-3 flex flex-wrap items-baseline justify-start gap-x-[0.35em] gap-y-1 text-left sm:mt-4 sm:mt-5">
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

          {/* 两列：数值加大；标签分别在数值下方 */}
          <div className="mt-5 grid w-full max-w-[15rem] grid-cols-2 gap-x-3 gap-y-1 text-left sm:mt-6 sm:max-w-[17rem] sm:gap-x-4">
            <div className="flex flex-col items-start gap-1">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[clamp(1.35rem,5vw,1.75rem)] font-semibold leading-none tabular-nums text-white sm:text-3xl">
                0.8%
              </span>
              <span className="text-[12px] font-medium text-[#9fb0c9] sm:text-sm">{t('hero.pillDailyLabel')}</span>
            </div>
            <div className="min-w-0 flex flex-col items-start gap-1">
              <span className="max-w-full break-words font-[family-name:var(--font-jetbrains-mono)] text-[clamp(1.05rem,4.2vw,1.65rem)] font-semibold leading-tight tabular-nums text-white sm:text-2xl">
                {tvlText}
              </span>
              <span className="text-[12px] font-medium text-[#9fb0c9] sm:text-sm">{t('hero.pillTvlLabel')}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-start max-lg:mt-5 sm:mt-8">
            <Link
              href="/stake"
              className="inline-flex rounded-full bg-plasma-cyan px-7 py-2.5 text-[15px] font-semibold text-void-black transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 sm:px-8 sm:py-3 sm:text-base"
            >
              {t('hero.cta1')}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[12px] font-normal tracking-wide text-[#8b9cb4] max-lg:mt-4 sm:mt-7 sm:text-[13px]">
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
