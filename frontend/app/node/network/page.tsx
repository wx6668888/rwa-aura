import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { ParticleField } from '@/components/nodes/particle-field'
import { MyNetworkPageClient } from '@/components/node/network/my-network-page-client'

export const metadata = {
  title: 'My Network | RWA Protocol',
  description: 'Node level, team overview, dividends, referrals, tree and ranking',
}

export default function NodeNetworkPage() {
  return (
    <div className="relative min-h-screen bg-[#05050a]">
      <BackgroundEffects />
      <ParticleField />
      <Navbar />
      <MyNetworkPageClient />
    </div>
  )
}
