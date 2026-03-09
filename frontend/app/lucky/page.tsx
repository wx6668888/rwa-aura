'use client';

import { Navbar } from '@/components/navbar';
import { BackgroundEffects } from '@/components/background-effects';
import LuckyHeader from '@/components/lucky/lucky-header';
import PoolSwitcher from '@/components/lucky/pool-switcher';
import PrizePoolCard from '@/components/lucky/prize-pool-card';
import TicketPurchaseCard from '@/components/lucky/ticket-purchase-card';
import MyTicketsCard from '@/components/lucky/my-tickets-card';
import OddsCalculator from '@/components/lucky/odds-calculator';
import RecentWinners from '@/components/lucky/recent-winners';
import PrizeBreakdownTable from '@/components/lucky/prize-breakdown-table';
import DrawHistory from '@/components/lucky/draw-history';
import HowItWorks from '@/components/lucky/how-it-works';
import FairnessProof from '@/components/lucky/fairness-proof';
import DrawTimeAndRulesNotice from '@/components/lucky/draw-time-and-rules-notice';
import { useState } from 'react';
import type { LuckyPoolType } from '@/components/lucky/pool-switcher';

export default function LuckyPage() {
  const [activePool, setActivePool] = useState<LuckyPoolType>('realtime');

  return (
    <div className="relative min-h-screen bg-void-black text-text-primary">
      {/* Enhanced festive background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Larger cyan orb top-right */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-plasma-cyan rounded-full blur-3xl opacity-15" />
        
        {/* Larger purple orb bottom-left */}
        <div className="absolute bottom-0 left-0 w-[900px] h-[900px] bg-void-purple rounded-full blur-3xl opacity-12" />
        
        {/* Gold orb center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-node rounded-full blur-3xl opacity-[0.08]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                backgroundColor: [
                  '#00f5d4',
                  '#8b5cf6',
                  '#f59e0b',
                ][Math.floor(Math.random() * 3)],
                opacity: Math.random() * 0.2 + 0.1,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
              }}
            />
          ))}
        </div>
        
        {/* Enhanced grain texture */}
        <div className="absolute inset-0 bg-grain opacity-[0.05]" />
      </div>

      <BackgroundEffects />
      <Navbar />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <LuckyHeader />
        
        <PoolSwitcher activePool={activePool} onPoolChange={setActivePool} />

        {/* Main Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left 60% */}
          <div className="lg:col-span-3 space-y-4">
            <PrizePoolCard poolType={activePool} />
            <TicketPurchaseCard poolType={activePool} />
          </div>

          {/* Right 40% */}
          <div className="lg:col-span-2 space-y-4">
            <MyTicketsCard poolType={activePool} />
            <OddsCalculator poolType={activePool} />
            <RecentWinners />
          </div>
        </div>

        {/* Prize Breakdown */}
        <PrizeBreakdownTable />

        {/* Draw History */}
        <DrawHistory />

        {/* How It Works */}
        <HowItWorks />

        {/* Draw time (Dubai) & rollover rules */}
        <DrawTimeAndRulesNotice />

        {/* Fairness Proof */}
        <FairnessProof />
      </main>
    </div>
  );
}
