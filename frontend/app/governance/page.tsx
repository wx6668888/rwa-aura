import type { Metadata } from 'next'
import { GovernancePageClient } from '@/components/governance/governance-page-client'

export const metadata: Metadata = {
  title: 'RWA Protocol — 治理公示',
  description: '协议参数、资金状况、Timelock队列与实时链上活动。只读，无需连接钱包。',
}

export default function GovernancePage() {
  return (
    <div className="scanline-overlay scanline-sweep min-h-screen bg-[#05050a]">
      {/* Fixed orbs */}
      <div
        className="pointer-events-none fixed right-0 top-0 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,245,212,0.08) 0%, transparent 70%)',
          transform: 'translate(30%, -30%)',
        }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-0 h-[800px] w-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)',
        }}
      />

      <GovernancePageClient />
    </div>
  )
}
