'use client'

import { useState } from 'react'
import { BackgroundEffects } from '@/components/background-effects'
import LuckyHeader from '@/components/lucky/lucky-header'
import PoolSwitcher from '@/components/lucky/pool-switcher'
import PrizePoolCard from '@/components/lucky/prize-pool-card'
import TicketPurchaseCard from '@/components/lucky/ticket-purchase-card'
import MyTicketsCard from '@/components/lucky/my-tickets-card'
import OddsCalculator from '@/components/lucky/odds-calculator'
import RecentWinners from '@/components/lucky/recent-winners'
import PrizeBreakdownTable from '@/components/lucky/prize-breakdown-table'
import DrawHistory from '@/components/lucky/draw-history'
import HowItWorks from '@/components/lucky/how-it-works'
import FairnessProof from '@/components/lucky/fairness-proof'
import DrawTimeAndRulesNotice from '@/components/lucky/draw-time-and-rules-notice'
import { stable01 } from '@/lib/stable-random'
import type { LuckyPoolType } from '@/components/lucky/pool-switcher'

export default function LuckyPage() {
  const [activePool, setActivePool] = useState<LuckyPoolType>('realtime')

  return (
    <div className="relative min-h-screen bg-void-black text-text-primary">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute right-0 top-0 h-[800px] w-[800px] rounded-full bg-plasma-cyan opacity-15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[900px] w-[900px] rounded-full bg-void-purple opacity-12 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-node opacity-[0.08] blur-3xl" />

        <div className="absolute inset-0">
          {Array.from({ length: 80 }).map((_, i) => {
            const left = stable01(i, 1) * 100
            const top = stable01(i, 2) * 100
            const size = stable01(i, 3) * 2 + 1
            const colorIndex = Math.floor(stable01(i, 4) * 3)
            const opacity = stable01(i, 5) * 0.2 + 0.1
            const animationDelay = stable01(i, 6) * 5
            const animationDuration = stable01(i, 7) * 10 + 10
            const color = ['#00f5d4', '#8b5cf6', '#f59e0b'][colorIndex]

            return (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                  opacity,
                  animationDelay: `${animationDelay}s`,
                  animationDuration: `${animationDuration}s`,
                }}
              />
            )
          })}
        </div>

        <div className="absolute inset-0 bg-grain opacity-[0.05]" />
      </div>

      <BackgroundEffects />

      <main className="relative z-10 container mx-auto px-4 pb-24 pt-below-navbar-safe sm:px-6 lg:px-8">
        <LuckyHeader />
        <PoolSwitcher activePool={activePool} onPoolChange={setActivePool} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <PrizePoolCard poolType={activePool} />
            <TicketPurchaseCard poolType={activePool} />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <MyTicketsCard poolType={activePool} />
            <OddsCalculator poolType={activePool} />
            <RecentWinners />
          </div>
        </div>

        <PrizeBreakdownTable />
        <DrawHistory />
        <HowItWorks />
        <DrawTimeAndRulesNotice />
        <FairnessProof />
      </main>
    </div>
  )
}
