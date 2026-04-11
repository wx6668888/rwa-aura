import { BackgroundEffects } from '@/components/background-effects'
import { NodesPageClient } from '@/components/nodes/nodes-page-client'
import { ParticleField } from '@/components/nodes/particle-field'

export const metadata = {
  title: 'Node Levels | RWA Protocol',
  description: 'View your node level, reward rates and referral network',
}

export default function NodesPage() {
  return (
    <div className="relative min-h-screen bg-[#05050a]">
      <BackgroundEffects />
      <ParticleField />
      <NodesPageClient />
    </div>
  )
}
