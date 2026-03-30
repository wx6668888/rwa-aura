import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/hero-section'
import { HomeBelowFold } from '@/components/home-below-fold'

export default function HomePage() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <HeroSection />
      <HomeBelowFold />
    </div>
  )
}
