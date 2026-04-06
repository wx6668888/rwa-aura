'use client'

import dynamic from 'next/dynamic'
import { HomeVisibleSection } from '@/components/home-visible-section'
import { HomeSlideReveal } from '@/components/home-slide-reveal'

function BarPulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className ?? ''}`} aria-hidden />
}

const StatsBar = dynamic(() => import('@/components/stats-bar').then((m) => ({ default: m.StatsBar })), {
  ssr: false,
  loading: () => <BarPulse className="mx-auto mt-1 h-[4.5rem] max-w-7xl" />,
})

const HomeMobilePromoCard = dynamic(
  () => import('@/components/home-mobile-promo-card').then((m) => ({ default: m.HomeMobilePromoCard })),
  { ssr: false, loading: () => <BarPulse className="min-h-[22rem] w-full" /> }
)

const HomeLatestStakes = dynamic(
  () => import('@/components/home-latest-stakes').then((m) => ({ default: m.HomeLatestStakes })),
  { ssr: false, loading: () => <BarPulse className="min-h-[28rem] w-full" /> }
)

const FeaturesSection = dynamic(
  () => import('@/components/features-section').then((m) => ({ default: m.FeaturesSection })),
  { ssr: false, loading: () => <BarPulse className="min-h-[24rem] w-full" /> }
)

const HowItWorksSection = dynamic(
  () => import('@/components/how-it-works-section').then((m) => ({ default: m.HowItWorksSection })),
  { ssr: false, loading: () => <BarPulse className="min-h-[24rem] w-full" /> }
)

const HomeTrustCardsCarousel = dynamic(
  () => import('@/components/home-trust-cards-carousel').then((m) => ({ default: m.HomeTrustCardsCarousel })),
  { ssr: false, loading: () => <BarPulse className="min-h-[22rem] w-full" /> }
)

const HomeTrustedBy = dynamic(
  () => import('@/components/home-trusted-by').then((m) => ({ default: m.HomeTrustedBy })),
  { ssr: false, loading: () => <BarPulse className="min-h-[10rem] w-full" /> }
)

const FooterSection = dynamic(
  () => import('@/components/footer-section').then((m) => ({ default: m.FooterSection })),
  { ssr: false, loading: () => <BarPulse className="min-h-[30rem] w-full rounded-none" /> }
)

/** 首屏下方：按视口分段挂载，减轻首包与同时进行的请求/动画 */
export function HomeBelowFold() {
  return (
    <>
      <HomeVisibleSection minHeight="5.5rem" className="w-full">
        <StatsBar />
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="22rem" className="w-full">
        <HomeMobilePromoCard />
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="28rem" className="w-full">
        <HomeLatestStakes />
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="32rem" className="w-full">
        <HomeSlideReveal from="left">
          <FeaturesSection />
        </HomeSlideReveal>
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="32rem" className="w-full">
        <HomeSlideReveal from="right">
          <HowItWorksSection />
        </HomeSlideReveal>
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="26rem" className="w-full">
        <HomeSlideReveal from="left">
          <HomeTrustCardsCarousel />
        </HomeSlideReveal>
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="16rem" className="w-full">
        <HomeSlideReveal from="right">
          <HomeTrustedBy />
        </HomeSlideReveal>
      </HomeVisibleSection>

      <HomeVisibleSection minHeight="30rem" className="w-full">
        <HomeSlideReveal from="left">
          <FooterSection />
        </HomeSlideReveal>
      </HomeVisibleSection>
    </>
  )
}
