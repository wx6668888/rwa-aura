'use client'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** 整体尺寸，如 h-3.5 w-[26px] */
  sizeClassName?: string
}

/**
 * 左 ↑ 右 ↓：仅两条开放折线（人字），无竖线、无填充，小尺寸下也不会像实心块。
 * 单 SVG 避免双图标对齐误差。
 */
export function HollowSwapArrows({ className, sizeClassName = 'h-4 w-[26px]' }: Props) {
  return (
    <svg
      className={cn(sizeClassName, 'shrink-0', className)}
      viewBox="0 0 26 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 14 L7.5 8 L11 14"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M15 6 L18.5 12 L22 6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
