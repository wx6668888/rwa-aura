'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { useTeamStats } from '@/hooks/useTeamStats'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useReferralNetworkOverview } from '@/hooks/useReferralNetworkOverview'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { useRetentionLeaderboard } from '@/hooks/useRetentionLeaderboard'
import { computeNodeLevel } from '@/lib/compute-node-level'
import { getNodeLevelConfig } from '@/lib/node-levels'
import { useNetworkStore } from '@/store/networkStore'
import { NetworkTreeModal } from '@/components/nodes/network-tree-modal'
import { NetworkRefreshRow } from './network-refresh-row'
import { TeamPeriodOverview } from './team-period-overview'
import { TeamActivityChart } from './team-activity-chart'
import { DividendModule } from './dividend-module'
import { ReferralRewardModule } from './referral-reward-module'
import { NetworkTabBar, type NetworkTabId } from './network-tab-bar'
import { DirectReferralsTab } from './direct-referrals-tab'
import { NetworkTreeTab } from './network-tree-tab'
import { RankingTab } from './ranking-tab'
import { InviteSection } from './invite-section'
import { estimatedDailyDividendPercent } from '@/lib/network-page-doc'

const RWA_PRICE = 0.85

export function MyNetworkPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const chainId = useChainId()
  const { isConnected, address } = useAccount()
  const { refresh: refreshTeam, ...teamStats } = useTeamStats()
  const { referrals, loading: refLoading, count: directCount } = useDirectReferrals()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const { data: ov, loading: ovLoading, refresh: ovRefresh } = useReferralNetworkOverview()
  const { rewards, loading: rewLoading, refresh: rewRefresh } = useReferralRewards()
  const { rows: rankRows, myRank, myRetainedUsdt, loading: rankLoading, refresh: rankRefresh } =
    useRetentionLeaderboard(80)

  const lastRefreshMs = useNetworkStore((s) => s.lastRefreshMs)
  const touchRefresh = useNetworkStore((s) => s.touchRefresh)

  const [tab, setTab] = useState<NetworkTabId>('direct')
  const [spin, setSpin] = useState(false)
  const [treeOpen, setTreeOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralLink, setReferralLink] = useState('')

  const nt = useCallback((k: string, p?: Record<string, string | number>) => t(`networkDoc.${k}`, p), [t])

  const localeBcp47 =
    locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US'

  useEffect(() => {
    if (address && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/?ref=${address}`)
    } else {
      setReferralLink('')
    }
  }, [address])

  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const personalStakeCurrent = usdtStaked + rwaStaked * RWA_PRICE

  const myLevel = useMemo(() => {
    if (!isConnected) return 1
    return computeNodeLevel({
      personalStakeUSDT: personalStakeCurrent,
      teamVolumeUSDT: teamStats.teamVolume,
      teamRetainedUSDT: teamStats.teamRetained,
    })
  }, [isConnected, personalStakeCurrent, teamStats.teamVolume, teamStats.teamRetained])

  const myCfg = getNodeLevelConfig(myLevel) ?? getNodeLevelConfig(1)!

  const dailyEst = useMemo(() => {
    const pct = estimatedDailyDividendPercent(myLevel, myCfg.dividendWeight)
    return (teamStats.teamRetained * pct) / 100
  }, [myLevel, myCfg.dividendWeight, teamStats.teamRetained])

  const dataLoading = teamStats.loading || ovLoading

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTeam(), ovRefresh(), rewRefresh(), rankRefresh()])
    touchRefresh()
  }, [refreshTeam, ovRefresh, rewRefresh, rankRefresh, touchRefresh])

  const onManualRefresh = useCallback(async () => {
    setSpin(true)
    await refreshAll()
    setTimeout(() => setSpin(false), 1500)
  }, [refreshAll])

  useEffect(() => {
    const id = setInterval(() => {
      void refreshAll()
    }, 300_000)
    return () => clearInterval(id)
  }, [refreshAll])

  const copyLink = useCallback(() => {
    if (!address || typeof window === 'undefined') return
    const link = `${window.location.origin}/?ref=${address}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [address])

  const earnedStr = rewards.matured.toLocaleString(undefined, { maximumFractionDigits: 2 })

  const chartDaily =
    ov?.teamChartDaily30?.length ? ov.teamChartDaily30 : (ov?.teamChart14d ?? [])
  const chartMonthly = ov?.teamChartMonthly12 ?? []

  return (
    <div className="relative mx-auto min-h-screen max-w-[520px] pb-24 pt-[72px] font-[family-name:var(--font-space-grotesk)] text-[#f1f5f9]">
      <NetworkRefreshRow
        lastRefreshMs={lastRefreshMs}
        lastLabel={nt('lastUpdated')}
        refreshLabel={nt('refresh')}
        localeBcp47={localeBcp47}
        onRefresh={() => void onManualRefresh()}
        spinning={spin || dataLoading}
      />

      {!isConnected && (
        <div className="mx-5 mt-6 rounded-2xl border border-[#334155] bg-[#13131e]/80 p-6 text-center text-[13px] text-[#94a3b8]">
          {nt('connectHint')}
        </div>
      )}

      {isConnected && address && (
        <>
          <TeamPeriodOverview
            data={ov}
            loading={ovLoading}
            chainId={chainId || 56}
            localeKey={localeBcp47}
            labels={{
              todayStake: nt('periodTodayStake'),
              todayWd: nt('periodTodayWd'),
              weekStake: nt('periodWeekStake'),
              weekWd: nt('periodWeekWd'),
              monthStake: nt('periodMonthStake'),
              monthWd: nt('periodMonthWd'),
              subStake: nt('periodSubStake'),
              subWd: nt('periodSubWd'),
              periodWeek: nt('periodWeekRange'),
              periodMonth: nt('periodMonthRange'),
              utcNote: nt('periodUtc'),
              mixedWd: t('nodes.refNetMixedWithdrawNote'),
            }}
            t={t}
          />

          <TeamActivityChart
            daily30={chartDaily}
            monthly12={chartMonthly}
            title={nt('chartTitle')}
            subtitle={nt('chartSub')}
            stakeName={nt('chartStake')}
            withdrawName={nt('chartWithdraw')}
            localeBcp47={localeBcp47}
            rangeLabels={{ d7: nt('chartRange7d'), d30: nt('chartRange30d'), y12: nt('chartRange12m') }}
          />

          <div className="mt-4">
            <DividendModule
              teamRetainedUsdt={teamStats.teamRetained}
              levelConfig={myCfg}
              level={myLevel}
              todayEstimateUsdt={dailyEst.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              loading={dataLoading}
              labels={{
                title: nt('divTitle'),
                badge: nt('divBadge'),
                base: nt('divBase'),
                rate: nt('divRate'),
                today: nt('divToday'),
                rowBase: nt('divRowBase'),
                rowLevels: nt('divRowLevels'),
                rowRate: nt('divRowRate'),
                rowSettle: nt('divRowSettle'),
                valBase: nt('divValBase'),
                valLevels: nt('divValLevels'),
                valSettle: nt('divValSettle'),
                foot: nt('divFoot'),
              }}
            />
          </div>

          <div className="mt-3">
            <ReferralRewardModule
              totalEarned={rewards.matured.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              thisMonth={rewards.settledThisMonth.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              loading={rewLoading}
              labels={{
                title: nt('refTitle'),
                badge: nt('refBadge'),
                total: nt('refTotal'),
                month: nt('refMonth'),
                rule: nt('refRule'),
              }}
            />
          </div>

          <NetworkTabBar
            tab={tab}
            onTab={setTab}
            directCount={directCount}
            labels={{
              direct: nt('tabDirect'),
              tree: nt('tabTree'),
              ranking: nt('tabRanking'),
            }}
          />

          {tab === 'direct' && (
            <DirectReferralsTab
              referrals={referrals}
              loading={refLoading}
              localeBcp47={localeBcp47}
              onViewSubTree={() => setTreeOpen(true)}
              labels={{
                emptyTitle: nt('directEmptyTitle'),
                emptySub: nt('directEmptySub'),
                cta: nt('directCta'),
                teamSize: nt('directTeamSize'),
                stake: nt('directStake'),
                joined: nt('directJoined'),
                expandStake: nt('directExStake'),
                expandRet: nt('directExRet'),
                expandDaily: nt('directExDaily'),
                subPreview: nt('directSubHint'),
                viewSub: nt('directViewSub'),
                online: nt('directOn'),
                offline: nt('directOff'),
              }}
            />
          )}
          {tab === 'tree' && (
            <NetworkTreeTab
              me={address}
              referrals={referrals}
              labels={{
                title: nt('treeTitle'),
                expand: nt('treeExpand'),
                collapse: nt('treeCollapse'),
                you: nt('treeYou'),
                deeper: nt('treeDeeper'),
                empty: nt('treeEmpty'),
              }}
            />
          )}
          {tab === 'ranking' && (
            <RankingTab
              rows={rankRows}
              myAddress={address}
              myRank={myRank}
              myRetained={myRetainedUsdt}
              loading={rankLoading}
              labels={{
                intro: '',
                netRet: nt('rankNet'),
                you: nt('rankYou'),
                loadMore: nt('rankMore'),
              }}
            />
          )}

          <div className="mt-4">
            <InviteSection
              link={referralLink}
              copied={copied}
              onCopy={copyLink}
              invitedCount={directCount}
              earnedRwa={earnedStr}
              labels={{
                title: nt('inviteTitle'),
                share: nt('inviteShare'),
                qr: nt('inviteQr'),
                copied: nt('inviteCopied'),
                copy: nt('inviteCopy'),
                stats: nt('inviteStats'),
              }}
            />
          </div>
        </>
      )}

      {treeOpen && (
        <NetworkTreeModal
          isOpen={treeOpen}
          onClose={() => setTreeOpen(false)}
          currentAddress={address || ''}
          referrals={referrals}
        />
      )}
    </div>
  )
}
