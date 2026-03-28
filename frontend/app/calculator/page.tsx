'use client';

import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { BackgroundEffects } from '@/components/background-effects';
import CalculatorHeader from '@/components/calculator/calculator-header';
import CalculatorInputPanel from '@/components/calculator/calculator-input-panel';
import CalculatorResultsPanel from '@/components/calculator/calculator-results-panel';
import CalculatorChart from '@/components/calculator/calculator-chart';
import ProtocolParameters from '@/components/calculator/protocol-parameters';
import ShareResult from '@/components/calculator/share-result';
import { CalculatorProvider } from '@/components/calculator/calculator-context';

export default function CalculatorPage() {
  return (
    <CalculatorProvider>
      <div className="relative min-h-screen bg-void-black text-text-primary">
        <BackgroundEffects />
        
        <Navbar />
        
        <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-below-navbar-safe pb-24">
          <CalculatorHeader />
          
          {/* Main Layout: 55/45 split on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-3">
            {/* Left Panel - Inputs (55%) */}
            <div className="lg:col-span-7">
              <CalculatorInputPanel />
            </div>
            
            {/* Right Panel - Results (45%) */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <CalculatorResultsPanel />
              </div>
            </div>
          </div>
          
          {/* Chart Section */}
          <CalculatorChart />
          
          {/* Protocol Parameters */}
          <ProtocolParameters />
          
          {/* Share Result */}
          <ShareResult />
        </main>
      </div>
    </CalculatorProvider>
  );
}
