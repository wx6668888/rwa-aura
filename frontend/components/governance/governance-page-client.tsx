'use client'

import { LiveIndicatorBar } from '@/components/governance/live-indicator-bar'
import { ProtocolParams } from '@/components/governance/protocol-params'
import { TreasuryPool } from '@/components/governance/treasury-pool'
import { TimelockQueue } from '@/components/governance/timelock-queue'
import { DAOVoting } from '@/components/governance/dao-voting'
import { ActivityFeed } from '@/components/governance/activity-feed'

export function GovernancePageClient() {
  return (
    <>
      <LiveIndicatorBar />
      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-below-navbar-safe lg:px-8">
        <ProtocolParams />
        <TreasuryPool />
        <DAOVoting />
        <TimelockQueue />
        <ActivityFeed />
      </main>
    </>
  )
}
