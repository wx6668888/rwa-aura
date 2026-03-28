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
}

export function RotatingLabels({ labels: labelsProp, labelClassName, multiline }: RotatingLabelsProps = {}) {
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
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % labels.length)
    }, 3000) // 每3秒切换一次

    return () => clearInterval(interval)
  }, [labels.length])

  const gap = 20 // 标签之间的间距（px）
  const labelHeightMobile = (multiline ? 96 : 40)   // 多行时留足 2 行 + 底部余量，避免裁切
  const labelHeightDesktop = (multiline ? 220 : 72) // 多行时 2 行 72px + 余量，避免最后一笔被裁
  
  const labelHeight = isMobile ? labelHeightMobile : labelHeightDesktop
  const scrollDistance = currentIndex * (labelHeight + gap)
  
  const defaultClass = 'font-[family-name:var(--font-space-grotesk)] text-[40px] font-black text-white lg:text-[72px]' + (multiline ? ' leading-tight block max-w-full' : ' leading-none')
  
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
