'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/** 压缩版桌面背景（约 5.2MB）— 仅宽屏挂载，避免手机端误下此资源 */
const HERO_PLANET_DESKTOP_MP4 = '/videos/planet_compressed.mp4'
const HERO_PLANET_DESKTOP_POSTER = '/videos/planet-poster.webp'
const HERO_PLANET_MOBILE_WEBM = '/videos/planet-mobile.webm'
const HERO_PLANET_MOBILE_MP4 = '/videos/planet-mobile.mp4'
const HERO_PLANET_MOBILE_POSTER = '/videos/planet-mobile-poster.webp'

/** 与 Tailwind `lg` 一致：窄屏只走移动端资源 */
const MOBILE_MQ = '(max-width: 1023px)'
const IDLE_DESKTOP_MS = 2800
/**
 * 窄屏：固定延迟后再挂 video（不用 requestIdleCallback 作为唯一触发器——空闲时会过早挂载，
 * 与 LCP/首包争带宽）。PSI 4G 下约 1.2MB 的 webm 会显著拖慢 Speed Index。
 */
const MOBILE_VIDEO_DELAY_MS = 5500

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(MOBILE_MQ)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function getNarrowSnapshot() {
  return window.matchMedia(MOBILE_MQ).matches
}

/** SSR：按窄屏出 HTML，避免 PSI 移动端把桌面 MP4 算进载荷 */
function getNarrowServerSnapshot() {
  return true
}

/**
 * 首屏先铺静态 poster，空闲后挂载 video。
 * 窄屏仅挂载手机片源；宽屏仅挂载桌面片源，杜绝手机同时拉 planet_compressed.mp4。
 */
function shouldSkipHeroVideoForDataSaver(): boolean {
  if (typeof navigator === 'undefined') return false
  const conn = navigator.connection as
    | { saveData?: boolean; effectiveType?: string }
    | undefined
  if (conn?.saveData) return true
  const et = conn?.effectiveType
  if (et === 'slow-2g' || et === '2g') return true
  return false
}

export function HeroPlanetBackground() {
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrowSnapshot, getNarrowServerSnapshot)
  const [mountVideo, setMountVideo] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (shouldSkipHeroVideoForDataSaver()) return

    /** 移动端：仅固定延迟，避免 rIC 过早挂载大体积 webm */
    if (isNarrow) {
      const id = window.setTimeout(() => setMountVideo(true), MOBILE_VIDEO_DELAY_MS)
      return () => window.clearTimeout(id)
    }

    let handle: number
    let ric = false
    const schedule = () => setMountVideo(true)
    if ('requestIdleCallback' in window) {
      ric = true
      handle = window.requestIdleCallback(schedule, { timeout: IDLE_DESKTOP_MS })
    } else {
      handle = window.setTimeout(schedule, 450) as unknown as number
    }
    return () => {
      if (ric) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [isNarrow])

  if (!mountVideo) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat lg:hidden"
          style={{
            backgroundImage: `url(${HERO_PLANET_MOBILE_POSTER})`,
            backgroundPosition: '50% 42%',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 hidden bg-cover bg-no-repeat lg:block"
          style={{
            backgroundImage: `url(${HERO_PLANET_DESKTOP_POSTER})`,
            backgroundPosition: '50% 45%',
          }}
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {isNarrow ? (
        <div className="absolute inset-0" aria-hidden>
          <video
            className="h-full w-full object-cover object-[50%_42%] opacity-100 [filter:brightness(1.14)_contrast(1.06)_saturate(1.05)]"
            poster={HERO_PLANET_MOBILE_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
          >
            <source src={HERO_PLANET_MOBILE_WEBM} type="video/webm" />
            <source src={HERO_PLANET_MOBILE_MP4} type="video/mp4" />
          </video>
        </div>
      ) : (
        <div className="absolute inset-0" aria-hidden>
          <video
            className="h-full w-full object-cover object-[50%_45%] opacity-[0.96]"
            poster={HERO_PLANET_DESKTOP_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={HERO_PLANET_DESKTOP_MP4} type="video/mp4" />
          </video>
        </div>
      )}
    </div>
  )
}
