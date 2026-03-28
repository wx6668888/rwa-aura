'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Lottie from 'lottie-react'

// 使用 Next.js dynamic 导入，正确处理命名导出
const DotLottieReact = dynamic(
  () =>
    import('@lottiefiles/dotlottie-react').then((mod) => {
      // 确保返回正确的组件（作为 default 导出）
      const Component = mod.DotLottieReact
      if (!Component) {
        console.error('无法找到 DotLottieReact，模块导出:', Object.keys(mod))
        throw new Error('DotLottieReact 组件未找到')
      }
      // 返回一个包含 default 的对象，因为 dynamic 期望 default 导出
      return { default: Component }
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-[#64748b] text-sm">
        加载动画中...
      </div>
    ),
  }
)

interface LottieAnimationProps {
  src: string
  className?: string
  autoplay?: boolean
  loop?: boolean
  speed?: number
  width?: number | string
  height?: number | string
  style?: React.CSSProperties
}

/** JSON Lottie 播放器：请求 JSON 后用 lottie-react 渲染 */
function JsonLottiePlayer({
  src,
  className = '',
  autoplay = true,
  loop = true,
  speed = 1,
  width = '100%',
  height = '100%',
  style,
}: LottieAnimationProps) {
  const [data, setData] = useState<object | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => setData(null))
    return () => {
      cancelled = true
    }
  }, [src])

  if (!data) {
    return (
      <div className={className} style={{ width, height, minHeight: 80, ...style }}>
        <div className="flex items-center justify-center h-full text-[#64748b] text-sm">加载动画中...</div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width, height, ...style }}>
      <Lottie
        animationData={data}
        loop={loop}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

/**
 * Lottie 动画组件
 * 推荐使用 dotLottie (.lottie) 格式：
 * - 文件小（比 JSON 小 94%）
 * - 性能好
 * - 支持主题和状态机
 * - 无需会员
 */
export function LottieAnimation({
  src,
  className = '',
  autoplay = true,
  loop = true,
  speed = 1,
  width = '100%',
  height = '100%',
  style,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 判断文件格式
  const isDotLottie = src.endsWith('.lottie')
  const isJson = src.endsWith('.json')

  if (isDotLottie) {
    // 使用 dotLottie-react 播放 .lottie 文件（推荐）
    return (
      <div ref={containerRef} className={className} style={{ width, height, ...style }}>
        <DotLottieReact
          src={src}
          autoplay={autoplay}
          loop={loop}
          speed={speed}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )
  }

  if (isJson) {
    return (
      <JsonLottiePlayer
        src={src}
        className={className}
        autoplay={autoplay}
        loop={loop}
        speed={speed}
        width={width}
        height={height}
        style={style}
      />
    )
  }

  return (
    <div className={className} style={{ width, height, ...style }}>
      <p className="text-sm text-[#64748b]">不支持的动画格式，请使用 .lottie 或 .json 格式</p>
    </div>
  )
}

/**
 * 简化的 dotLottie 动画组件
 * 专门用于播放 .lottie 格式文件
 */
export function DotLottieAnimation({
  src,
  className = '',
  autoplay = true,
  loop = true,
  speed = 1,
  width = '100%',
  height = '100%',
  style,
}: Omit<LottieAnimationProps, 'src'> & { src: string }) {
  return (
    <div className={className} style={{ width, height, ...style }}>
      <DotLottieReact
        src={src}
        autoplay={autoplay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
