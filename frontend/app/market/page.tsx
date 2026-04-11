import { BackgroundEffects } from '@/components/background-effects'
import { PriceHeader } from '@/components/market/price-header'
import { ChartPanel } from '@/components/market/chart-panel'
import { StatsPanel } from '@/components/market/stats-panel'
import { RecentTradesTable } from '@/components/market/recent-trades-table'

export const metadata = {
  title: '行情 | RWA Protocol',
  description: 'RWA代币实时价格、图表和市场数据',
}

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects opacity={8} />

      <PriceHeader />

      <main className="mx-auto max-w-7xl px-4 pb-[100px] pt-4 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
          <ChartPanel />
          <StatsPanel />
        </div>
        
        <div className="mt-6">
          <RecentTradesTable />
        </div>
      </main>
    </div>
  )
}
