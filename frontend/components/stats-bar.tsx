'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useHomepageStats } from '@/hooks/useHomepageStats'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { formatUsdAmount } from '@/lib/stats-display'

function useCountUp(target: number, shouldStart: boolean, durationMs = 1800) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!shouldStart) {
      setValue(0)
      return
    }
    const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0
    if (safeTarget === 0) {
      setValue(0)
      return
    }

    let rafId = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      // easeOutCubic，让滚动前快后慢更自然
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(safeTarget * eased)
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, shouldStart, durationMs])

  return value
}

const MOBILE_MAX = '(max-width: 1023px)'
/** 手机首屏不展示指标条，下滑超过此阈值后再出现（避免与 Hero 挤在同一屏） */
const MOBILE_STATS_SCROLL_PX = 72

export function StatsBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const homepageStats = useHomepageStats()
  const { data: analyticsStats } = useAnalyticsStats()
  const [animateInView, setAnimateInView] = useState(false)
  const [mobileRevealed, setMobileRevealed] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MOBILE_MAX)
    if (!mq.matches) {
      setMobileRevealed(true)
      return
    }
    setMobileRevealed(window.scrollY >= MOBILE_STATS_SCROLL_PX)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MOBILE_MAX)
    const tick = () => {
      if (!mq.matches) {
        setMobileRevealed(true)
        return
      }
      setMobileRevealed(window.scrollY >= MOBILE_STATS_SCROLL_PX)
    }
    window.addEventListener('scroll', tick, { passive: true })
    mq.addEventListener('change', tick)
    return () => {
      window.removeEventListener('scroll', tick)
      mq.removeEventListener('change', tick)
    }
  }, [])

  useEffect(() => {
    if (!mobileRevealed) return
    if (!sectionRef.current || animateInView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAnimateInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [animateInView, mobileRevealed])

  const countUpOn = animateInView && mobileRevealed
  const rewardsAnimated = useCountUp(analyticsStats.totalRewardsTrackedUsdt, countUpOn, 2100)
  const usersAnimated = useCountUp(homepageStats.users, countUpOn, 1900)
  const priceAnimated = useCountUp(homepageStats.price, countUpOn, 1600)

  if (!mobileRevealed) {
    return null
  }

  const statItems = [
    { value: formatUsdAmount(rewardsAnimated), label: t('stats.totalEarned') },
    { value: Math.round(usersAnimated).toLocaleString(), label: t('stats.stakers.label') },
    { value: `$${priceAnimated.toFixed(2)}`, label: t('stats.price.label') },
  ]

  return (
    <section ref={sectionRef} className="border-y border-border-subtle">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-8 sm:gap-4 lg:flex lg:items-center lg:justify-center lg:gap-0 lg:divide-x lg:divide-border-subtle lg:px-8">
        {statItems.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center lg:px-16"
          >
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-plasma-cyan sm:text-2xl lg:text-4xl">
              {stat.value}
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-text-secondary sm:text-[11px] sm:tracking-[0.2em]">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
