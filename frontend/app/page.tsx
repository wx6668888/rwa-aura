import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/hero-section'
import { HomeBelowFold } from '@/components/home-below-fold'
import { HeroPlanetBackground } from '@/components/hero-planet-background'

export default function HomePage() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#0a0a0f] font-sans">
      <HeroPlanetBackground />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[#0a0a0f] [opacity:var(--home-planet-cover,0)] [will-change:opacity]" aria-hidden />
      {/* 底留白改由页脚 pb 承担，避免滑到底时主内容区再叠一大块黑底在条带下方 */}
      {/* z-20：主内容列；底部 RWA.LAT 条在 portal 内 z-[22]，高于本层以便露出 */}
      <div className="relative z-20">
        <BackgroundEffects />
        <HeroSection />
        <HomeBelowFold />
      </div>
    </div>
  )
}
