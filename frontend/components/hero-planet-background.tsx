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
/** 窄屏：晚于首屏文案/CSS/字体后再挂 video，减轻与 LCP 在 4G 上的带宽竞争 */
const IDLE_MOBILE_MS = 2800

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
export function HeroPlanetBackground() {
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrowSnapshot, getNarrowServerSnapshot)
  const [mountVideo, setMountVideo] = useState(false)

  useEffect(() => {
    let handle: number
    let ric = false
    const schedule = () => setMountVideo(true)
    const idleCap = isNarrow ? IDLE_MOBILE_MS : IDLE_DESKTOP_MS
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      ric = true
      handle = window.requestIdleCallback(schedule, { timeout: idleCap })
    } else if (typeof window !== 'undefined') {
      handle = window.setTimeout(schedule, isNarrow ? 380 : 450) as unknown as number
    } else {
      return
    }
    return () => {
      if (typeof window === 'undefined') return
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
            preload="metadata"
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
