'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount, useChainId } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { teamDividendPoolABI } from '@/lib/contracts/teamDividendPoolABI'
import { ProjectDividendCard } from './project-dividend-card'
import { Gift, Loader2, TrendingUp, History, BarChart3 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function DividendPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isZh = locale.startsWith('zh')

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['dividend-user', address?.toLowerCase(), chainId],
    queryFn: async () => {
      if (!address) return null
      const url = chainId
        ? `${API_BASE}/api/dividend/user/${address}?chainId=${chainId}`
        : `${API_BASE}/api/dividend/user/${address}`
      const res = await fetch(url)
      if (!res.ok) return null
      const json = await res.json()
      return json?.data ?? null
    },
    enabled: !!address && isConnected,
    staleTime: 30_000,
  })

  const { data: poolData } = useQuery({
    queryKey: ['dividend-pool-status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/dividend/pool/status`)
      if (!res.ok) return null
      const json = await res.json()
      return json?.data ?? null
    },
    staleTime: 60_000,
  })

  const { data: rateHistory } = useQuery({
    queryKey: ['dividend-rate-history'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/dividend/rate/history`)
      if (!res.ok) return []
      const json = await res.json()
      return json?.data ?? []
    },
    staleTime: 60_000,
  })

  const poolAddress =
    chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
      ? (
          CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] as {
            teamDividendPool?: string
          }
        )?.teamDividendPool
      : undefined

  const balance = userData?.account?.balance ?? '0'
  const balanceNum = parseFloat(balance)
  const history = userData?.history ?? []
  const currentMonth = userData?.currentMonth

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const handleWithdraw = () => {
    if (!poolAddress || balanceNum <= 0) return
    const amountWei = parseUnits(balance, 6)
    writeContract({
      address: poolAddress as `0x${string}`,
      abi: teamDividendPoolABI,
      functionName: 'withdrawDividend',
      args: [amountWei],
    })
  }

  if (txHash && !isPending && !isConfirming) {
    refetchUser()
  }

  return (
    <main className="relative mx-auto max-w-4xl px-4 pb-[100px] pt-24 lg:px-8">
      <div className="pb-6">
        <p
          className="text-[11px] uppercase tracking-widest text-[#10b981]"
          style={{ fontVariant: 'small-caps' }}
        >
          {isZh ? '团队业绩分红' : 'Team Dividend'}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[#f1f5f9]">
          {isZh ? '分红中心' : 'Dividend Center'}
        </h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* 分红资格与提取 */}
        <ProjectDividendCard />

        {/* 分红池状态（公开） */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: '#0d0d14',
            borderColor: '#10b98130',
            boxShadow: '0 0 0 1px #10b98115, 0 8px 32px #10b98108',
          }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#10b981]" />
            <span className="text-sm font-semibold text-[#f1f5f9]">
              {isZh ? '分红池状态' : 'Pool Status'}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#10b98120] bg-[#10b98108] p-4">
              <p className="text-[11px] text-[#64748b]">
                {isZh ? '可调拨余额' : 'Available Balance'}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-[#10b981]">
                {poolData?.availableBalance != null
                  ? parseFloat(poolData.availableBalance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '—'}{' '}
                USDT
              </p>
            </div>
            <div className="rounded-xl border border-[#64748b30] bg-[#0d0d14] p-4">
              <p className="text-[11px] text-[#64748b]">
                {isZh ? '健康度' : 'Health Ratio'}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-[#94a3b8]">
                {poolData?.healthRatio != null
                  ? `${(poolData.healthRatio * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {poolData?.healthStatus ?? ''}
              </p>
            </div>
          </div>
          {poolData?.nextMonthRate && (
            <div className="mt-4 rounded-xl border border-[#64748b20] p-3">
              <p className="text-[11px] text-[#64748b]">
                {isZh ? '下月比例' : 'Next Month Rate'}
              </p>
              <p className="mt-1 text-sm text-[#94a3b8]">
                L2: {poolData.nextMonthRate.L2}% · L3: {poolData.nextMonthRate.L3}% · L5:{' '}
                {poolData.nextMonthRate.L5}% · L9: {poolData.nextMonthRate.L9}%
              </p>
              <p className="text-[11px] text-[#64748b]">
                {poolData.nextMonthRate.status}
              </p>
            </div>
          )}
        </div>

        {/* 用户可提取与历史（需连接钱包） */}
        {isConnected && address && (
          <>
            {balanceNum > 0 && poolAddress && (
              <div
                className="rounded-2xl border p-6"
                style={{
                  background: '#0d0d14',
                  borderColor: '#10b98140',
                  boxShadow: '0 0 0 1px #10b98120, 0 8px 32px #10b98110',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#10b981]" />
                    <span className="text-sm font-semibold text-[#f1f5f9]">
                      {isZh ? '可提取分红' : 'Withdrawable'}
                    </span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#10b981]">
                    {balanceNum.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USDT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming}
                  className="mt-4 w-full rounded-lg border border-[#10b98140] bg-[#10b98120] py-3 text-sm font-medium text-[#10b981] transition hover:bg-[#10b98130] disabled:opacity-50"
                >
                  {isPending || isConfirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isZh ? '处理中...' : 'Processing...'}
                    </span>
                  ) : (
                    isZh ? '提取分红' : 'Withdraw Dividend'
                  )}
                </button>
              </div>
            )}

            {currentMonth && (
              <div
                className="rounded-2xl border p-6"
                style={{
                  background: '#0d0d14',
                  borderColor: '#64748b30',
                }}
              >
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-[#64748b]" />
                  <span className="text-sm font-semibold text-[#f1f5f9]">
                    {isZh ? '当月预估' : 'Current Month Estimate'}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">{isZh ? '节点等级' : 'Node Level'}</span>
                    <span className="font-mono text-[#94a3b8]">L{currentMonth.nodeLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">{isZh ? '分红比例' : 'Rate'}</span>
                    <span className="font-mono text-[#94a3b8]">{currentMonth.actualRate}%</span>
                  </div>
                  {currentMonth.netGrowth && (
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">{isZh ? '本月净增业绩' : 'Net Growth'}</span>
                      <span className="font-mono text-[#94a3b8]">
                        {parseFloat(currentMonth.netGrowth).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        USDT
                      </span>
                    </div>
                  )}
                  {currentMonth.estimatedDividend && (
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">
                        {isZh ? '预估本月分红' : 'Estimated Dividend'}
                      </span>
                      <span className="font-mono text-[#10b981]">
                        {parseFloat(currentMonth.estimatedDividend).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        USDT
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div
                className="rounded-2xl border p-6"
                style={{
                  background: '#0d0d14',
                  borderColor: '#64748b30',
                }}
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#64748b]" />
                  <span className="text-sm font-semibold text-[#f1f5f9]">
                    {isZh ? '历史记录' : 'History'}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {history.slice(0, 12).map((h: { month: string; dividendAmount: string; status: string }) => (
                    <div
                      key={h.month}
                      className="flex items-center justify-between rounded-lg border border-[#64748b20] px-4 py-2"
                    >
                      <span className="text-[#94a3b8]">{h.month}</span>
                      <span className="font-mono text-[#10b981]">
                        {parseFloat(h.dividendAmount).toFixed(2)} USDT
                      </span>
                      <span className="text-[11px] text-[#64748b]">{h.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 比例历史（公开） */}
        {rateHistory && rateHistory.length > 0 && (
          <div
            className="rounded-2xl border p-6"
            style={{
              background: '#0d0d14',
              borderColor: '#64748b30',
            }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#64748b]" />
              <span className="text-sm font-semibold text-[#f1f5f9]">
                {isZh ? '比例历史' : 'Rate History'}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {rateHistory.slice(0, 6).map((r: { month: string; adjustment_type: string; health_ratio: number }) => (
                <div
                  key={r.month}
                  className="flex items-center justify-between rounded-lg border border-[#64748b20] px-4 py-2"
                >
                  <span className="text-[#94a3b8]">{r.month}</span>
                  <span className="text-[11px] text-[#64748b]">{r.adjustment_type}</span>
                  <span className="font-mono text-[#64748b]">
                    {(r.health_ratio * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
