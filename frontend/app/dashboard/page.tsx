import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { WalletBar } from '@/components/dashboard/wallet-bar'
import { PortfolioCard } from '@/components/dashboard/portfolio-card'
import { EarningsCard } from '@/components/dashboard/earnings-card'
import { InvestmentSharesCard } from '@/components/dashboard/investment-shares-card'
import { ReinvestRewardsCard } from '@/components/dashboard/reinvest-rewards-card'
import { StatCards } from '@/components/dashboard/stat-cards'
import { FundActivityCard } from '@/components/dashboard/fund-activity-card'
import { NodeLevelsInfo } from '@/components/dashboard/node-levels-info'

export const metadata = {
  title: '仪表板 | RWA Protocol',
  description: '查看您的质押总额、收益和团队数据',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans">
      <BackgroundEffects />
      <Navbar />
      <WalletBar />

      <main className="mx-auto max-w-7xl px-4 pb-[100px] pt-8 lg:px-8">
        {/* Row 1: Portfolio + Earnings — 2 equal columns on desktop */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PortfolioCard />
          <EarningsCard />
        </div>

        {/* Row 2: Investment Shares + Reinvest Rewards — 2 equal columns on desktop */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <InvestmentSharesCard />
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

        {/* Row 4: Node Levels Info — full width */}
        <div className="mt-4">
          <NodeLevelsInfo />
        </div>
      </main>
    </div>
  )
}
