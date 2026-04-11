import { BackgroundEffects } from '@/components/background-effects'
import { ParticleField } from '@/components/nodes/particle-field'
import { ReferralNetworkPageClient } from '@/components/nodes/referral-network-page-client'

export const metadata = {
  title: 'Referral Network | RWA Protocol',
  description: 'Share your referral link and browse your direct network with L1–L9 level visuals',
}

export default function ReferralNetworkPage() {
  return (
    <div className="relative min-h-screen bg-[#05050a]">
      <BackgroundEffects />
      <ParticleField />
      <ReferralNetworkPageClient />
    </div>
  )
}
