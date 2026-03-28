'use client'

/**
 * 品牌横滚：双轨 + translateX(-50%) 无缝循环（trusted-brands-marquee__track）
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
    <section className="relative overflow-hidden border-t border-neutral-800 bg-black py-20 md:py-[7.5rem]">
      {!reduced && (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover"
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
          'absolute inset-0 z-10 bg-black',
          reduced ? 'opacity-90' : 'opacity-60',
        )}
        aria-hidden
      />

      <div className="relative z-20 mx-auto max-w-7xl space-y-10 px-6">
        <h2
          className={cn(
            'text-center text-2xl font-normal md:text-4xl',
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
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
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
          <div className="relative w-full overflow-hidden py-2">
            <div className={styles.track}>
              <BrandStrip />
              <BrandStrip />
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black to-transparent"
              aria-hidden
            />
          </div>
        )}
      </div>
    </section>
  )
}
