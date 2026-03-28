import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { StakePageClient } from '@/components/stake/stake-page-client'

export const metadata = {
  title: '质押 | RWA Protocol',
  description: '存入USDT，每日获得0.8%的RWA代币静态收益',
}

export default function StakePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <StakePageClient />
    </div>
  )
}
