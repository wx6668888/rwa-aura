'use client'

import { useEffect, useRef, useState } from 'react'
import { DotLottieAnimation } from '@/components/lottie-animation'

type Props = {
  src: string
  className?: string
  autoplay?: boolean
  loop?: boolean
  speed?: number
  /** 扩大预取窗口，让 .lottie 更早开始下载（仍晚于挂载播放器，减轻主线程） */
  rootMargin?: string
  /** 覆盖默认海报（/lottie-posters/<与 .lottie 同名>.webp）；传空字符串可禁用 */
  posterSrc?: string
}

/** /foo/bar/稳定币0.lottie → /lottie-posters/稳定币0.webp */
export function defaultLottiePosterUrl(src: string): string | undefined {
  if (!src.endsWith('.lottie')) return undefined
  const parts = src.split('/').filter(Boolean)
  const file = parts.pop()
  if (!file) return undefined
  const base = decodeURIComponent(file).replace(/\.lottie$/i, '')
  if (!base) return undefined
  return `/lottie-posters/${encodeURIComponent(base)}.webp`
}

/** 仅对站点根路径下的 .lottie 做分段编码，避免中文文件名在部分环境下的请求异常 */
export function encodePublicLottieSrc(src: string): string {
  if (!src || /^(https?:|data:|blob:)/i.test(src)) return src
  const [pathPart, ...hashParts] = src.split('#')
  const [pathname, ...queryParts] = pathPart.split('?')
  const query = queryParts.length ? `?${queryParts.join('?')}` : ''
  const hash = hashParts.length ? `#${hashParts.join('#')}` : ''
  if (!pathname.startsWith('/')) return src
  const segs = pathname.split('/').map((seg) => {
    if (!seg) return ''
    try {
      return encodeURIComponent(decodeURIComponent(seg))
    } catch {
      return encodeURIComponent(seg)
    }
  })
  return segs.join('/') + query + hash
}

/**
 * 进入视口后再挂载 DotLottie；接近视口时用 link rel=preload 预取二进制，缩短白屏。
 * 默认展示 /lottie-posters/<与 .lottie 同名>.webp（由 `npm run assets:promo-lottie` 生成）。
 * 进一步压缩 .lottie 见 lottie-animation-usage.md。
 */
export function LazyDotLottieAnimation({
  src,
  className = '',
  autoplay = true,
  loop = true,
  speed = 1,
  rootMargin = '120px 0px 200px 0px',
  posterSrc,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [lottieLoaded, setLottieLoaded] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const preloadedRef = useRef(false)

  const resolvedSrc = encodePublicLottieSrc(src)
  const resolvedPoster =
    posterSrc === '' ? undefined : (posterSrc ?? defaultLottiePosterUrl(src))
  const showPoster = Boolean(resolvedPoster) && !posterFailed

  useEffect(() => {
    setLottieLoaded(false)
  }, [src, show])

  useEffect(() => {
    setPosterFailed(false)
    preloadedRef.current = false
  }, [src])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || show) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        if (!preloadedRef.current && typeof document !== 'undefined') {
          preloadedRef.current = true
          const href = resolvedSrc.startsWith('/') ? resolvedSrc : `/${resolvedSrc}`
          if (!document.querySelector(`link[data-lottie-preload="${href}"]`)) {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'fetch'
            link.href = href
            link.setAttribute('data-lottie-preload', href)
            document.head.appendChild(link)
          }
        }
        setShow(true)
        io.disconnect()
      },
      { root: null, rootMargin, threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show, resolvedSrc, rootMargin])

  return (
    <div ref={wrapRef} className={`relative ${className}`.trim()}>
      {showPoster ? (
        <img
          src={resolvedPoster}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onError={() => setPosterFailed(true)}
          className={`absolute inset-0 z-0 h-full w-full object-contain transition-opacity duration-500 ease-out ${
            show && lottieLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        />
      ) : null}
      {show ? (
        <DotLottieAnimation
          src={resolvedSrc}
          className="relative z-[1] h-full min-h-0 w-full"
          autoplay={autoplay}
          loop={loop}
          speed={speed}
          onPlaybackReady={() => setLottieLoaded(true)}
        />
      ) : showPoster ? null : (
        <div className="h-full min-h-[8rem] w-full bg-transparent" aria-hidden />
      )}
    </div>
  )
}
