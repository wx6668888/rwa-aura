'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface RotatingLabelsProps {
  /** 可选：自定义轮播文案，不传则使用首页 hero.assets / hero.earnings */
  labels?: string[]
  /** 可选：标签文字样式；可为字符串（所有标签同款）或数组（按顺序对应每个标签） */
  labelClassName?: string | string[]
  /** 多行模式：为 true 时每个标签占 2 行高度，避免长文案（西/英/日等）被裁切 */
  multiline?: boolean
  /** hero：与首页 Lido 式大标题同级的字号与行高占位 */
  variant?: 'default' | 'hero'
  /** 每项占位高度（px），用于自定义文案字号时避免裁切 */
  rowHeightPx?: { mobile: number; desktop: number }
  /** 项与项之间的间距（px），默认随 variant */
  gapPx?: number
}

export function RotatingLabels({
  labels: labelsProp,
  labelClassName,
  multiline,
  variant = 'default',
  rowHeightPx,
  gapPx,
}: RotatingLabelsProps = {}) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(true)

  const labels = labelsProp ?? [
    t('hero.assets'),
    t('hero.earnings'),
  ]

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (labels.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % labels.length)
    }, 3000) // 每3秒切换一次

    return () => clearInterval(interval)
  }, [labels.length])

  if (labels.length === 0) {
    return null
  }

  const gap =
    gapPx !== undefined ? gapPx : variant === 'hero' ? 16 : 20
  const labelHeightMobile = rowHeightPx
    ? rowHeightPx.mobile
    : multiline
      ? 96
      : variant === 'hero'
        ? 48
        : 40
  const labelHeightDesktop = rowHeightPx
    ? rowHeightPx.desktop
    : multiline
      ? 220
      : variant === 'hero'
        ? 78
        : 72

  const labelHeight = isMobile ? labelHeightMobile : labelHeightDesktop
  const scrollDistance = currentIndex * (labelHeight + gap)

  const defaultClass =
    variant === 'hero'
      ? 'font-[family-name:var(--font-space-grotesk)] text-[clamp(2.125rem,7.2vw,4.125rem)] font-bold leading-[0.92] tracking-[-0.025em] text-white' +
        (multiline ? ' block max-w-full leading-tight' : '')
      : 'font-[family-name:var(--font-space-grotesk)] text-[40px] font-black text-white lg:text-[72px]' +
        (multiline ? ' leading-tight block max-w-full' : ' leading-none')
  
  return (
    <div className="relative overflow-hidden" style={{ height: `${labelHeight}px` }}>
      <div
        className="flex flex-col transition-all duration-500 ease-in-out"
        style={{
          transform: `translateY(-${scrollDistance}px)`,
        }}
      >
        {labels.map((label, index) => (
          <div
            key={index}
            className={`flex flex-shrink-0 justify-start ${multiline ? 'items-start' : 'items-center'}`}
            style={{
              height: `${labelHeight}px`,
              marginBottom: index < labels.length - 1 ? `${gap}px` : '0',
            }}
          >
            <span className={Array.isArray(labelClassName) ? (labelClassName[index] ?? labelClassName[0] ?? defaultClass) : (labelClassName ?? defaultClass)}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
