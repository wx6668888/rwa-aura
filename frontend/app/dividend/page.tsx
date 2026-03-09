import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { DividendPageClient } from '@/components/dividend/dividend-page-client'

export const metadata = {
  title: 'Team Dividend | RWA Protocol',
  description: 'Team performance dividend, pool status and withdrawal',
}

export default function DividendPage() {
  return (
    <div className="relative min-h-screen bg-[#05050a]">
      <BackgroundEffects />
      <Navbar />
      <DividendPageClient />
    </div>
  )
}
