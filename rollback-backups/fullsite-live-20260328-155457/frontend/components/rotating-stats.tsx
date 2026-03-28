'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface RotatingStat {
  label: string
  value: string
  subLabel?: string
}

export function RotatingStats() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [currentIndex, setCurrentIndex] = useState(0)

  // 定义要循环展示的数据
  const stats: RotatingStat[] = [
    {
      label: locale === 'zh' ? '资产' : locale === 'en' ? 'Assets' : 'Assets',
      value: '1,000.00',
      subLabel: 'RWA',
    },
    {
      label: locale === 'zh' ? '收益' : locale === 'en' ? 'Earnings' : 'Earnings',
      value: '$850.00',
      subLabel: 'USDT',
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stats.length)
    }, 3000) // 每3秒切换一次

    return () => clearInterval(interval)
  }, [stats.length])

  const currentStat = stats[currentIndex]

  return (
    <div className="relative h-24 overflow-hidden sm:h-28 lg:h-32">
      {/* 滚动容器 */}
      <div
        className="flex flex-col transition-all duration-700 ease-in-out"
        style={{
          transform: `translateY(-${currentIndex * 100}%)`,
        }}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex min-h-[96px] flex-col items-center justify-center sm:min-h-[112px] lg:min-h-[128px]"
          >
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[36px] font-black leading-none text-text-primary sm:text-[52px] lg:text-[72px]">
              {stat.value}
            </span>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-text-secondary sm:text-sm">
                {stat.label}
              </span>
              {stat.subLabel && (
                <>
                  <span className="h-1 w-1 rounded-full bg-plasma-cyan" />
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium text-text-secondary sm:text-sm">
                    {stat.subLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 指示器点 */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
        {stats.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-6 bg-plasma-cyan'
                : 'w-1.5 bg-text-secondary/30 hover:bg-text-secondary/50'
            }`}
            aria-label={`Go to ${stats[index].label}`}
          />
        ))}
      </div>
    </div>
  )
}
