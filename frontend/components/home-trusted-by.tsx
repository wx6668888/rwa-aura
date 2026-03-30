'use client'

/**
 * 「备受顶尖机构信赖」：单卡片容器 + 背景 wave 视频（已压缩为小体积 MP4）
 */
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'
import styles from './home-trusted-by.module.css'

const WAVE_VIDEO_SRC = '/videos/wave.mp4'

const BRAND_IMAGES: { src: string; alt: string }[] = [
  { src: '/images/brands/amber.webp', alt: 'Amber' },
  { src: '/images/brands/galaxy.webp', alt: 'Galaxy' },
  { src: '/images/brands/binance.webp', alt: 'Binance' },
  { src: '/images/brands/okx.webp', alt: 'OKX' },
  { src: '/images/brands/bybit.webp', alt: 'Bybit' },
  { src: '/images/brands/fasanara.webp', alt: 'Fasanara Digital' },
  { src: '/images/brands/republic.webp', alt: 'Repulic Digital' },
]

function BrandStrip() {
  return (
    <div className={cn(styles.strip, 'gap-20 pr-20')}>
      {BRAND_IMAGES.map(({ src, alt }) => (
        <img
          key={`${alt}-${src}`}
          src={src}
          alt={alt}
          className="block h-[40px] w-auto max-w-[200px] object-contain opacity-95"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  )
}

export function HomeTrustedBy() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reduced = usePrefersReducedMotion()

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-[#0d0d14]/90 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#0d0d14]/82">
        {!reduced && (
          <video
            className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-105 object-cover opacity-50"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
          >
            <source src={WAVE_VIDEO_SRC} type="video/mp4" />
          </video>
        )}

        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#0a0a0f]/88 via-[#05050a]/82 to-[#0a0a0f]/90',
            reduced && 'from-[#0a0a0f] via-[#05050a] to-[#0a0a0f]',
          )}
          aria-hidden
        />

        <div className="relative z-10 px-5 py-10 md:px-10 md:py-12">
          <h2
            className={cn(
              'text-center text-2xl font-semibold md:text-3xl',
              locale === 'zh' ? 'tracking-wide' : 'uppercase tracking-widest',
            )}
            style={{
              color: '#00f5d4',
              textShadow:
                '0 0 12px rgba(0,245,212,0.85), 0 0 28px rgba(0,245,212,0.45), 0 0 48px rgba(0,245,212,0.2)',
            }}
          >
            {t('home.trustedByTitle')}
          </h2>

          {reduced ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:mt-10">
              {BRAND_IMAGES.map(({ src, alt }) => (
                <img
                  key={alt}
                  src={src}
                  alt={alt}
                  className="block h-[40px] w-auto object-contain opacity-95"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          ) : (
            <div className="relative mt-8 w-full overflow-hidden py-2 md:mt-10">
              <div className={styles.track}>
                <BrandStrip />
                <BrandStrip />
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0a0a0f] to-transparent md:w-14"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0a0a0f] to-transparent md:w-14"
                aria-hidden
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
