'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

const FONT_RWA_LAT = 'clamp(2.75rem, min(21vw, 16.5rem), 16.5rem)' as const
const TRACK_UNIFORM = '0.12em' as const

type Props = {
  /** 0 = 自上而下完全裁切隐藏；1 = 整条可见。条本身 fixed 不位移，仅靠 clip 模拟被页面上滑「揭开」/下拉「盖住」 */
  progress: number
}

/**
 * 固定贴底、不随滚动平移；用 clip-path 从底部向上「揭开」。
 * 须高于首页主列 stacking（page 内为 z-20），否则会被页脚实色底完全挡住而「看不见」；
 * 仍低于导航 z-[100]，避免挡菜单。
 */
export function HomeFixedRwaReveal({ progress }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reduced = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const p = reduced ? (progress >= 0.5 ? 1 : 0) : Math.max(0, Math.min(1, progress))
  /** 从顶部裁掉 (1-p)*100%，只剩底部 p 比例 —— 条位置不动，视觉上像被页面从上往下盖住 */
  const clipTopPct = (1 - p) * 100

  const bar = (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-[22] box-border w-full max-w-[100vw] overflow-x-clip bg-[#00f5d4]',
        reduced && 'transition-[clip-path] duration-200 ease-out'
      )}
      style={{
        paddingTop: 0,
        paddingBottom: 'var(--app-safe-bottom, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 0,
        paddingRight: 0,
        clipPath: `inset(${clipTopPct}% 0 0 0)`,
        WebkitClipPath: `inset(${clipTopPct}% 0 0 0)`,
        willChange: 'clip-path',
      }}
      aria-hidden={p < 0.02}
      aria-label={t('footer.revealAria')}
    >
      <p
        className="mx-auto w-full max-w-[100vw] text-center font-[family-name:var(--font-space-grotesk)] font-black uppercase text-[#05050a]"
        style={{
          fontSize: FONT_RWA_LAT,
          letterSpacing: TRACK_UNIFORM,
          lineHeight: 0.82,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          margin: 0,
          fontFeatureSettings: '"kern" 1, "liga" 1',
        }}
      >
        RWA.LAT
      </p>
    </div>
  )

  if (!mounted) return null
  return createPortal(bar, document.body)
}
