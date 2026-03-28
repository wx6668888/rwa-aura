'use client'

import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { WalletBar } from '@/components/dashboard/wallet-bar'
import { DividendPageClient } from '@/components/dividend/dividend-page-client'

export default function DividendPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <WalletBar />
      <DividendPageClient />
    </div>
  )
}

