'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { DotLottieAnimation } from '@/components/lottie-animation'
import { RotatingLabels } from '@/components/rotating-labels'
import Link from 'next/link'

const FADE_SCROLL_RANGE = 280
const HERO_LOTTIE_SRC = '/动画/blockchain.lottie'

export function HeroSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(typeof window !== 'undefined' ? window.scrollY : 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fadeOpacity = Math.max(0, 1 - scrollY / FADE_SCROLL_RANGE)

  return (
    <section className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 pt-28 pb-16 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:pt-32 lg:pb-24">
      {/* Mobile: 占位，保持布局 */}
      <div className="relative flex w-full justify-center lg:hidden h-[300px] flex-shrink-0" aria-hidden="true">
        <div className="flex h-[300px] w-full items-center justify-center pointer-events-none" />
      </div>

      {/* Mobile: 固定顶部的动图，随滚动渐变透明 */}
      <div
        className="fixed top-0 left-0 right-0 z-10 pt-28 flex justify-center pointer-events-none lg:hidden"
        style={{ opacity: fadeOpacity }}
        aria-hidden="true"
      >
        <div className="flex h-[300px] w-full max-w-7xl px-4 items-center justify-center">
          <div className="h-[260px] w-full max-w-[320px]">
            <DotLottieAnimation
              src={HERO_LOTTIE_SRC}
              className="h-full w-full"
              autoplay={true}
              loop={true}
              speed={1}
            />
          </div>
        </div>
      </div>

      {/* Left 60% - Content Block（手机端透明背景，上滑时透过可见渐淡的动图） */}
      <div className="flex-[3] space-y-6 order-2 lg:order-1 relative z-20 -mt-8 lg:mt-0">
          {/* Overline */}
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary">
            {t('hero.overline').split('·').map((part, i, arr) => (
              <span key={i}>
                {part.trim()}
                {i < arr.length - 1 && (
                  <span className="mx-2 inline-block h-1 w-1 rounded-full bg-plasma-cyan align-middle" />
                )}
              </span>
            ))}
          </p>

          {/* "真实" + 滚动标签 */}
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-space-grotesk)] text-[40px] font-black leading-none text-plasma-cyan lg:text-[72px]">
              {t('hero.real')}
            </span>
            <div className="flex items-center">
              <RotatingLabels />
            </div>
          </div>

          {/* H1 with animated gradient - removed "真实" text */}
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[40px] font-black leading-[1.1] text-text-primary lg:text-[72px]">
            {(() => {
              const titleStart = t('hero.titleLine1Start')
              // 检查是否是各种语言的"真实"、"Real"等
              const realWords = ['真实', 'Real', '실제', '実', 'Réels', 'Reais', 'Réels', 'Реальные', 'Реальная', 'أصول', 'عوائد', 'वास्तविक', 'Actifs', 'Ativos']
              if (!realWords.includes(titleStart) && titleStart.trim() !== '') {
                return (
                  <span className="bg-gradient-to-r from-plasma-cyan via-[#00d4ff] to-plasma-cyan bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    {titleStart}
                  </span>
                )
              }
              return null
            })()}
            {t('hero.titleLine1End')}
          </h1>

          {/* Subtitle */}
          <p className="max-w-md text-base leading-relaxed text-text-secondary lg:text-lg">
            {t('hero.subtitle')}
          </p>

          {/* Button Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/stake"
              className="rounded-full bg-plasma-cyan px-8 py-3 font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-void-black transition-all hover:scale-[1.02] hover:brightness-110 shadow-[0_0_20px_rgba(0,245,212,0.3)]"
            >
              {t('hero.cta1')} {'\u2192'}
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-border-active px-8 py-3 text-base font-medium text-text-primary transition-colors hover:bg-surface-2"
            >
              {t('hero.cta2')}
            </Link>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-[12px] font-medium uppercase tracking-[0.15em] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span>{'🔒'}</span>
              <span>{t('hero.trust1')}</span>
            </span>
            <span className="h-1 w-1 rounded-full bg-plasma-cyan" />
            <span className="flex items-center gap-1.5">
              <span>{'⛓'}</span>
              <span>{t('hero.trust2')}</span>
            </span>
            <span className="h-1 w-1 rounded-full bg-plasma-cyan" />
            <span className="flex items-center gap-1.5">
              <span>{'👁️'}</span>
              <span>{t('hero.trust3')}</span>
            </span>
          </div>
        </div>

      {/* Right 40% - Animation Block (desktop only) */}
      <div className="relative flex-[2] hidden lg:flex order-1 lg:order-2">
        <div className="flex h-[500px] w-full items-center justify-center">
          <div className="h-[380px] w-full max-w-[480px]">
            <DotLottieAnimation
              src={HERO_LOTTIE_SRC}
              className="h-full w-full"
              autoplay={true}
              loop={true}
              speed={1}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
