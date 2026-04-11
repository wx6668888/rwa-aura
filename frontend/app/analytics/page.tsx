'use client'

import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BackgroundEffects } from '@/components/background-effects'
import KeyMetricsRow from '@/components/analytics/key-metrics-row'
import TvlHistoryChart from '@/components/analytics/tvl-history-chart'
import DailyStakingChart from '@/components/analytics/daily-staking-chart'
import DailyRewardsChart from '@/components/analytics/daily-rewards-chart'
import NodeDistribution from '@/components/analytics/node-distribution'
import ReferralGrowthChart from '@/components/analytics/referral-growth-chart'
import FundFlowSankey from '@/components/analytics/fund-flow-sankey'
import TopStakersTable from '@/components/analytics/top-stakers-table'
import ProtocolHealthIndicators from '@/components/analytics/protocol-health-indicators'
import LiveBar from '@/components/analytics/live-bar'
import TimeRangeSelector from '@/components/analytics/time-range-selector'
import ExportShareButtons from '@/components/analytics/export-share-buttons'

export default function AnalyticsPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '180d' | 'all'>('30d')

  return (
    <>
      <div className="relative min-h-screen">
      <BackgroundEffects />
      
      {/* Animated Scanline Effect */}
      <div className="pointer-events-none fixed inset-0 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00f5d408] to-transparent h-[2px] animate-scanline" />
      </div>

      <div className="relative z-20">
        {/* Page Header */}
        <div className="px-4 pb-4 pt-[calc(6rem+var(--app-safe-top))] sm:px-6 sm:pb-6 sm:pt-[calc(7rem+var(--app-safe-top))]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <BarChart2 className="w-9 h-9 sm:w-11 sm:h-11 text-[#00f5d4] mx-auto" />
              
              <div className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] uppercase tracking-widest text-[#64748b] font-medium">
                {t('analytics.overline')}
              </div>
              
              <h1 className="mt-2 sm:mt-3 text-[28px] sm:text-[40px] font-[800] text-[#f1f5f9] leading-tight max-w-2xl mx-auto px-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('analytics.title')}
              </h1>
              
              <p className="mt-2 sm:mt-3 text-[13px] sm:text-[15px] text-[#64748b] max-w-xl mx-auto px-4">
                {t('analytics.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Live Bar */}
        <LiveBar />

        {/* Time Range Selector */}
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-[60px] sm:pb-[100px]">
          {/* Section 1: Key Metrics */}
          <KeyMetricsRow timeRange={timeRange} />

          {/* Section 2: TVL History */}
          <div className="mt-6">
            <TvlHistoryChart timeRange={timeRange} />
          </div>

          {/* Section 3: Two Column Charts */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyStakingChart timeRange={timeRange} />
            <DailyRewardsChart timeRange={timeRange} />
          </div>

          {/* Section 4: Node Distribution */}
          <div className="mt-6">
            <NodeDistribution />
          </div>

          {/* Section 5: Referral Network Growth */}
          <div className="mt-6">
            <ReferralGrowthChart timeRange={timeRange} />
          </div>

          {/* Section 6: Fund Flow Sankey */}
          <div className="mt-6">
            <FundFlowSankey timeRange={timeRange} />
          </div>

          {/* Section 7: Top Stakers Table */}
          <div className="mt-6">
            <TopStakersTable />
          </div>

          {/* Section 8: Protocol Health Indicators */}
          <div className="mt-6">
            <ProtocolHealthIndicators />
          </div>

          {/* Export & Share */}
          <div className="mt-6">
            <ExportShareButtons />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scanline {
          0% {
            transform: translateY(-100vh);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
      `}</style>
      </div>
    </>
  )
}
