'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const IMG_APPLE_PNG = encodeURI('/苹果.png')
const IMG_SAMSUNG_PNG = encodeURI('/三星.png')

/** 与 scripts/build-promo-and-lottie-posters.mjs 输出一致（窄档 + 源宽档） */
const APPLE_AVIF =
  '/images/promo-phones/apple-320.avif 320w, /images/promo-phones/apple-355.avif 355w'
const APPLE_WEBP =
  '/images/promo-phones/apple-320.webp 320w, /images/promo-phones/apple-355.webp 355w'
const SAMSUNG_AVIF =
  '/images/promo-phones/samsung-320.avif 320w, /images/promo-phones/samsung-410.avif 410w'
const SAMSUNG_WEBP =
  '/images/promo-phones/samsung-320.webp 320w, /images/promo-phones/samsung-410.webp 410w'

/** 单卡约半宽，大屏约 280px 物理宽 */
const PROMO_IMG_SIZES = '(max-width: 768px) min(50vw, 240px), 280px'

function mobilePromoLinks() {
  const a = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL?.trim()
  const i = process.env.NEXT_PUBLIC_IOS_TUTORIAL_URL?.trim()
  return {
    android: a && a.length > 0 ? a : '/downloads/rwa-protocol-release.apk',
    ios: i && i.length > 0 ? i : 'https://rwa.lat/xxxxxxx',
  }
}

/** 预加载窄档 WebP（兼容性好、体积小），进入视口后尽快解码 */
function preloadImages(urls: string[]) {
  if (typeof document === 'undefined') return
  for (const href of urls) {
    if (document.querySelector(`link[data-preload-promo="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    link.setAttribute('data-preload-promo', href)
    document.head.appendChild(link)
  }
}

type PhonePictureProps = {
  avifSrcSet: string
  webpSrcSet: string
  pngFallback: string
  alt: string
  width: number
  height: number
  fetchPriority: 'high' | 'low'
  imgClassName: string
}

function PhonePicture({
  avifSrcSet,
  webpSrcSet,
  pngFallback,
  alt,
  width,
  height,
  fetchPriority,
  imgClassName,
}: PhonePictureProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcSet} sizes={PROMO_IMG_SIZES} />
      <source type="image/webp" srcSet={webpSrcSet} sizes={PROMO_IMG_SIZES} />
      <img
        src={pngFallback}
        alt={alt}
        width={width}
        height={height}
        sizes={PROMO_IMG_SIZES}
        decoding="async"
        fetchPriority={fetchPriority}
        className={imgClassName}
      />
    </picture>
  )
}

export function HomeMobilePromoCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reduced = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)

  const { android: androidHref, ios: iosHref } = mobilePromoLinks()

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          preloadImages([
            '/images/promo-phones/apple-320.webp',
            '/images/promo-phones/samsung-320.webp',
          ])
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 28% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const leftMotionClass = !inView
    ? 'mobile-promo-slide-left-idle'
    : reduced
      ? 'mobile-promo-slide-static'
      : 'mobile-promo-slide-left-run'
  const rightMotionClass = !inView
    ? 'mobile-promo-slide-right-idle'
    : reduced
      ? 'mobile-promo-slide-static'
      : 'mobile-promo-slide-right-run'

  const imgClass =
    'h-auto max-h-[18rem] w-full max-w-[220px] object-contain object-bottom drop-shadow-[0_16px_48px_rgba(0,0,0,0.5)] sm:max-h-[21rem] sm:max-w-[260px] md:max-h-[24rem] md:max-w-[280px]'

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto max-w-7xl overflow-x-hidden px-4 py-10 lg:px-8 lg:py-12"
      aria-labelledby="home-mobile-promo-title"
    >
      <div className="relative overflow-visible rounded-3xl border border-white/14 bg-[#0d0d14]/82 px-5 py-8 shadow-[0_0_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0d0d14]/72 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          aria-hidden
        >
          <div
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-45 sm:h-80 sm:w-80"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(0,245,212,0.28), rgba(0,245,212,0.04) 52%, rgba(0,245,212,0) 70%)',
            }}
          />
          <div
            className="absolute -bottom-28 -left-28 h-64 w-64 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 70% 70%, rgba(0,255,200,0.2), rgba(0,245,212,0.03) 55%, transparent 72%)',
            }}
          />
        </div>

        <div className="relative z-10">
          <h2
            id="home-mobile-promo-title"
            className="text-center font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight text-[#f1f5f9] sm:text-2xl"
          >
            {t('home.mobilePromoTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[13px] leading-relaxed text-[#94a3b8] sm:text-[14px]">
            {t('home.mobilePromoSubtitle')}
          </p>

          <div className="relative z-[5] mx-auto mt-10 flex min-h-[16rem] max-w-lg flex-row flex-nowrap items-end justify-center gap-3 sm:min-h-[19rem] sm:max-w-xl sm:gap-5 md:min-h-[22rem] md:gap-6">
            <div
              className={`flex shrink-0 basis-[46%] items-end justify-center sm:basis-[44%] ${leftMotionClass}`}
            >
              <div className="origin-bottom -translate-y-[2%] scale-[0.9025]">
                <PhonePicture
                  avifSrcSet={APPLE_AVIF}
                  webpSrcSet={APPLE_WEBP}
                  pngFallback={IMG_APPLE_PNG}
                  alt={t('home.mobilePromoAppleAlt')}
                  width={355}
                  height={699}
                  fetchPriority={inView ? 'high' : 'low'}
                  imgClassName={imgClass}
                />
              </div>
            </div>
            <div
              className={`flex shrink-0 basis-[46%] items-end justify-center sm:basis-[44%] ${rightMotionClass}`}
            >
              <PhonePicture
                avifSrcSet={SAMSUNG_AVIF}
                webpSrcSet={SAMSUNG_WEBP}
                pngFallback={IMG_SAMSUNG_PNG}
                alt={t('home.mobilePromoSamsungAlt')}
                width={410}
                height={780}
                fetchPriority={inView ? 'high' : 'low'}
                imgClassName={imgClass}
              />
            </div>
          </div>

          <div className="relative z-30 mx-auto mt-10 flex max-w-lg flex-row items-stretch justify-between gap-3 px-1 sm:mx-auto sm:max-w-xl sm:justify-center sm:gap-6 sm:px-4">
            <Link
              href={iosHref}
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-full border border-[#00f5d4]/40 bg-[#00f5d4]/10 px-4 py-3 text-center text-sm font-semibold text-[#00f5d4] transition-colors hover:bg-[#00f5d4]/18 sm:flex-none sm:min-w-[11rem]"
            >
              {t('home.mobilePromoIos')}
            </Link>
            <Link
              href={androidHref}
              download={androidHref.endsWith('.apk') ? 'rwa-protocol-release.apk' : undefined}
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-full bg-[#00f5d4] px-4 py-3 text-center text-sm font-extrabold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.2)] transition-transform hover:scale-[1.02] hover:brightness-110 sm:flex-none sm:min-w-[11rem]"
            >
              {t('home.mobilePromoAndroid')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
