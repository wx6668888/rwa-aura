'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UseEmblaCarouselType } from 'embla-carousel-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { Layers, ArrowRightLeft, LineChart, Network, Wallet, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type CarouselApi = UseEmblaCarouselType[1]

type Slide = {
  icon: LucideIcon
  titleKey: string
  ctaKey: string
  href: string
}

const slides: Slide[] = [
  { icon: Layers, titleKey: 'home.slideStakeTitle', ctaKey: 'home.slideStakeCta', href: '/stake' },
  { icon: ArrowRightLeft, titleKey: 'home.slideSwapTitle', ctaKey: 'home.slideSwapCta', href: '/swap' },
  { icon: LineChart, titleKey: 'home.slideMarketTitle', ctaKey: 'home.slideMarketCta', href: '/market' },
  { icon: Network, titleKey: 'home.slideNodesTitle', ctaKey: 'home.slideNodesCta', href: '/nodes' },
  { icon: Wallet, titleKey: 'home.slideWithdrawTitle', ctaKey: 'home.slideWithdrawCta', href: '/withdraw' },
]

const AUTOPLAY_MS = 5200

export function HomeActionCarousel() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [api, setApi] = useState<CarouselApi>()
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!api || reducedMotion) return
    const id = window.setInterval(() => {
      api.scrollNext()
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [api, reducedMotion])

  return (
    <section className="relative overflow-hidden border-y border-border-subtle bg-[#08080f] py-16 lg:py-20">
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 text-center md:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-secondary">
            {t('home.actionsLabel')}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {t('home.actionsTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary md:mx-0">
            {t('home.actionsSubtitle')}
          </p>
        </div>

        <div className="relative px-10 sm:px-14">
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              loop: true,
              skipSnaps: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {slides.map((slide) => {
                const Icon = slide.icon
                return (
                  <CarouselItem
                    key={slide.href}
                    className="pl-3 md:basis-1/2 md:pl-4 lg:basis-[38%]"
                  >
                    <Link
                      href={slide.href}
                      className="group relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 p-6 transition-all duration-300 hover:border-plasma-cyan/40 hover:shadow-[0_0_32px_rgba(0,245,212,0.12)] motion-safe:hover:-translate-y-0.5"
                    >
                      <div>
                        <div className="inline-flex rounded-xl border border-border-subtle bg-void-black/60 p-3 transition-transform duration-300 motion-safe:group-hover:scale-105">
                          <Icon className="h-6 w-6 text-plasma-cyan" strokeWidth={1.5} />
                        </div>
                        <h3 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-text-primary">
                          {t(slide.titleKey)}
                        </h3>
                      </div>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-plasma-cyan">
                        {t(slide.ctaKey)}
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-1 border-border-subtle bg-surface-2 text-text-primary hover:bg-surface-3 sm:-left-2" />
            <CarouselNext className="-right-1 border-border-subtle bg-surface-2 text-text-primary hover:bg-surface-3 sm:-right-2" />
          </Carousel>
        </div>
      </div>
    </section>
  )
}
