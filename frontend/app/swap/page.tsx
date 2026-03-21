'use client';

import { Navbar } from '@/components/navbar';
import { BackgroundEffects } from '@/components/background-effects';
import SwapHeader from '@/components/swap/swap-header';
import SwapCard from '@/components/swap/swap-card';
import { StRWASwapCard } from '@/components/swap/st-rwa-swap-card';

export default function SwapPage() {
  return (
    <div className="relative min-h-screen bg-void-black text-text-primary overflow-x-hidden">
      <BackgroundEffects />
      
      <Navbar />
      
      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
        <SwapHeader />
        
        <div className="max-w-[480px] mx-auto space-y-4 mt-2">
          <SwapCard />
          <StRWASwapCard />
        </div>
      </main>
    </div>
  );
}
