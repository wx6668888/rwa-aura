import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/hero-section'
import { StatsBar } from '@/components/stats-bar'
import { FeaturesSection } from '@/components/features-section'
import { HowItWorksSection } from '@/components/how-it-works-section'
import { FooterSection } from '@/components/footer-section'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <FooterSection />
    </div>
  )
}
