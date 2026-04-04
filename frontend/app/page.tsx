import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/hero-section'
import { HomeBelowFold } from '@/components/home-below-fold'

const HERO_PLANET_DESKTOP_MP4 = '/videos/planet.mp4'
const HERO_PLANET_DESKTOP_POSTER = '/videos/planet-poster.webp'
const HERO_PLANET_MOBILE_WEBM = '/videos/planet-mobile.webm'
const HERO_PLANET_MOBILE_MP4 = '/videos/planet-mobile.mp4'
const HERO_PLANET_MOBILE_POSTER = '/videos/planet-mobile-poster.webp'

export default function HomePage() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#0a0a0f] font-sans">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 lg:hidden" aria-hidden>
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
        <div className="absolute inset-0 hidden lg:block" aria-hidden>
          <video
            className="h-full w-full object-cover object-[50%_45%] opacity-[0.96]"
            poster={HERO_PLANET_DESKTOP_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          >
            <source src={HERO_PLANET_DESKTOP_MP4} type="video/mp4" />
          </video>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[#0a0a0f] [opacity:var(--home-planet-cover,0)] [will-change:opacity]" aria-hidden />
      <div className="relative z-10">
        <BackgroundEffects />
        <Navbar />
        <HeroSection />
        <HomeBelowFold />
      </div>
    </div>
  )
}
