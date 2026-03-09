'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LottieAnimation } from '@/components/lottie-animation'
import { RotatingLabels } from '@/components/rotating-labels'

const ABOUT_ANIMATION_HEIGHT = 280
const FADE_SCROLL_RANGE = 260

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
    <section className="relative px-4 pt-24 pb-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Desktop: 55/45 左文右图；Mobile: 单列，动图在第一块 */}
        <div className="grid gap-12 lg:grid-cols-[55fr_45fr] lg:gap-16">
          {/* 左 55%：文案（移动端 order-2 排在图下方，透明背景可透出渐淡动图） */}
          <div className="flex flex-col justify-center order-2 lg:order-1 relative z-20 -mt-8 lg:mt-0">
            {/* Overline */}
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
              {t('about.overline')}
            </div>

            {/* Title：两段滚动「将真实资产」/「带入链上金融」，移动端与桌面端一致 */}
            <h1 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-[48px] font-black leading-[1.1] text-[#f1f5f9]">
              <div className="flex flex-wrap items-baseline gap-2">
                {t('about.heroRotatePrefix') && (
                  <span className="text-[#00f5d4]">{t('about.heroRotatePrefix')}</span>
                )}
                <div className="flex items-start min-h-[96px] lg:min-h-[240px]">
                  <RotatingLabels
                    multiline
                    labels={[t('about.heroRotate1'), t('about.heroRotate2')]}
                    labelClassName={[
                      'font-[family-name:var(--font-space-grotesk)] text-[40px] font-black leading-tight block max-w-full text-white lg:text-[72px]',
                      'font-[family-name:var(--font-space-grotesk)] text-[40px] font-black leading-tight block max-w-full text-[#00f5d4] lg:text-[72px]',
                    ]}
                  />
                </div>
              </div>
            </h1>

            {/* Body */}
            <p className="mt-5 max-w-lg text-base leading-8 text-[#64748b]">
              {t('about.heroDesc')}
            </p>

            {/* Key numbers row - Mobile: single row with smaller text */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-8">
              <div className="text-center sm:text-left">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-extrabold text-[#00f5d4] sm:text-[32px]">
                  {t('about.stat1Value')}
                </div>
                <div className="mt-1 text-[10px] text-[#64748b] sm:text-xs">{t('about.stat1Label')}</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-extrabold text-[#00f5d4] sm:text-[32px]">
                  {t('about.stat2Value')}
                </div>
                <div className="mt-1 text-[10px] text-[#64748b] sm:text-xs">{t('about.stat2Label')}</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-extrabold text-[#00f5d4] sm:text-[32px]">
                  {t('about.stat3Value')}
                </div>
                <div className="mt-1 text-[10px] text-[#64748b] sm:text-xs">{t('about.stat3Label')}</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-extrabold text-[#00f5d4] sm:text-[32px]">
                  {t('about.stat4Value')}
                </div>
                <div className="mt-1 text-[10px] text-[#64748b] sm:text-xs">{t('about.stat4Label')}</div>
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link 
                href="/baipishu.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#00f5d4] px-8 py-3 font-semibold text-[#05050a] transition-all hover:scale-[1.02] hover:brightness-110"
              >
                {t('about.readDocs')}
              </Link>
              <Link 
                href="https://t.me/+nDdRxLhC6zkzNjhl"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#ffffff1a] bg-transparent px-8 py-3 font-semibold text-[#f1f5f9] transition-all hover:border-[#00f5d4]/30 hover:bg-[#13131e]"
              >
                {t('about.joinCommunity')}
              </Link>
            </div>
          </div>

          {/* Right 45% 桌面端；移动端 order-1：占位 + 固定动图随滚动渐变透明 */}
          <div className="flex items-center justify-center order-1 lg:order-2">
            {/* 移动端占位，保持布局 */}
            <div className="h-[280px] w-full flex-shrink-0 lg:hidden pointer-events-none" aria-hidden="true" />
            {/* 移动端固定顶部的动图，随滚动渐变透明 */}
            <div
              className="fixed top-0 left-0 right-0 z-10 pt-24 flex justify-center pointer-events-none lg:hidden"
              style={{ opacity: fadeOpacity }}
              aria-hidden="true"
            >
              <div className="flex h-[280px] w-full max-w-7xl px-4 items-center justify-center">
                <div className="relative h-[280px] w-full max-w-[320px] flex items-center justify-center">
                  <LottieAnimation
                    src="/动画/Data center.json"
                    loop
                    autoplay
                    width="100%"
                    height="100%"
                    className="max-w-full max-h-[280px] w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            {/* 桌面端：保持原样 */}
            <div className="hidden lg:flex items-center justify-center h-[380px] w-full max-w-[420px]">
              <div className="w-full h-full max-h-[380px] flex items-center justify-center">
                <LottieAnimation
                  src="/动画/Data center.json"
                  loop
                  autoplay
                  width="100%"
                  height="100%"
                  className="max-w-full max-h-[380px] w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
