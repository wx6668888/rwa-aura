import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/hero-section'
import { StatsBar } from '@/components/stats-bar'
import { HomeLatestStakes } from '@/components/home-latest-stakes'
import { FeaturesSection } from '@/components/features-section'
import { HowItWorksSection } from '@/components/how-it-works-section'
import { HomeTrustCardsCarousel } from '@/components/home-trust-cards-carousel'
import { HomeTrustedBy } from '@/components/home-trusted-by'
import { FooterSection } from '@/components/footer-section'

export default function HomePage() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HomeLatestStakes />
      <FeaturesSection />
      <HowItWorksSection />
      <HomeTrustCardsCarousel />
      <HomeTrustedBy />
      <FooterSection />
    </div>
  )
}
