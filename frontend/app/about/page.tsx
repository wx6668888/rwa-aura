'use client'

import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HeroSection } from '@/components/about/hero-section'
import { MissionValues } from '@/components/about/mission-values'
import { TeamSection } from '@/components/about/team-section'
import { RoadmapSection } from '@/components/about/roadmap-section'
import { PartnersSection } from '@/components/about/partners-section'
import { ProtocolNumbers } from '@/components/about/protocol-numbers'
import { ContactSection } from '@/components/about/contact-section'
import { FooterSection } from '@/components/about/footer-section'
import { LegalDisclaimer } from '@/components/about/legal-disclaimer'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />
      <main className="pb-24">
        <HeroSection />
        <MissionValues />
        <TeamSection />
        <RoadmapSection />
        <PartnersSection />
        <ProtocolNumbers />
        <ContactSection />
        <FooterSection />
        <LegalDisclaimer />
      </main>
    </div>
  )
}
