'use client'

import { BackgroundEffects } from '@/components/background-effects'
import { WalletBar } from '@/components/dashboard/wallet-bar'
import { PortfolioCard } from '@/components/dashboard/portfolio-card'
import { EarningsCard } from '@/components/dashboard/earnings-card'
import { InvestmentSharesCard } from '@/components/dashboard/investment-shares-card'
import { ReinvestRewardsCard } from '@/components/dashboard/reinvest-rewards-card'
import { TeamDividendCard } from '@/components/dashboard/team-dividend-card'
import { StatCards } from '@/components/dashboard/stat-cards'
import { FundActivityCard } from '@/components/dashboard/fund-activity-card'
import { StakesProvider } from '@/contexts/StakesContext'

export default function DashboardPage() {
  return (
    <StakesProvider>
      <div className="min-h-screen bg-[#0a0a0f] font-sans">
        <BackgroundEffects />
        <WalletBar />

      <main className="mx-auto max-w-7xl px-4 pb-[100px] pt-8 lg:px-8">
        {/* Row 1: Portfolio + Earnings — 2 equal columns on desktop */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PortfolioCard />
          <EarningsCard />
        </div>

        {/* Row 2: Investment Shares — full width */}
        <div className="mt-4">
          <InvestmentSharesCard />
        </div>

        {/* Row 2.5: Team Dividend — full width */}
        <div className="mt-4">
          <TeamDividendCard />
        </div>

        {/* Row 3: Reinvest Rewards — full width */}
        <div className="mt-4">
          <ReinvestRewardsCard />
        </div>

        {/* Row 3: 3 stat cards */}
        <div className="mt-4">
          <StatCards />
        </div>

        {/* Row 3: 资金活动 — full width */}
        <div className="mt-4">
          <FundActivityCard />
        </div>
      </main>
    </div>
    </StakesProvider>
  )
}
