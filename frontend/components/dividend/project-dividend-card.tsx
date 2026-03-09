'use client'

import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount, useChainId } from 'wagmi'
import { useLevelInfo } from '@/hooks/useLevelInfo'
import { useStakingContract } from '@/hooks/useStakingContract'
import { getNodeLevelConfig, NODE_LEVELS } from '@/lib/node-levels'
import { Gift, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { teamDividendPoolABI } from '@/lib/contracts/teamDividendPoolABI'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const RWA_PRICE = 0.85

export function ProjectDividendCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { levelInfo } = useLevelInfo()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()

  // 与节点页一致：用「实时计算」的等级判断分红资格，不依赖 DB 的 node_level
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const personalStakeCurrent = usdtStaked + rwaStaked * RWA_PRICE
  const teamVolumeCurrent = personalStakeCurrent + (levelInfo?.teamVolumeUsdt ?? 0)
  let calculatedLevel = 1
  for (let i = NODE_LEVELS.length - 1; i >= 0; i--) {
    const level = NODE_LEVELS[i]
    const meetsPersonal = personalStakeCurrent >= (level.personalStakeUSDT || 0)
    const meetsTeam = teamVolumeCurrent >= level.teamVolumeUSDT
    const meetsRetained = (levelInfo?.teamRetainedUsdt ?? 0) >= (level.teamRetainedUSDT ?? 0)
    if (meetsPersonal && meetsTeam && meetsRetained) {
      calculatedLevel = level.level
      break
    }
  }
  const nodeLevel = isConnected ? calculatedLevel : 1
  const config = getNodeLevelConfig(nodeLevel)
  const isEligible = config?.projectDividendEligible ?? false

  const { data: dividendData, refetch: refetchDividend } = useQuery({
    queryKey: ['dividend-user', address?.toLowerCase(), chainId],
    queryFn: async () => {
      if (!address) return null
      const url = chainId ? `${API_BASE}/api/dividend/user/${address}?chainId=${chainId}` : `${API_BASE}/api/dividend/user/${address}`
      const res = await fetch(url)
      if (!res.ok) return null
      const json = await res.json()
      return json?.data ?? null
    },
    enabled: !!address && isConnected,
    staleTime: 30_000,
  })

  const poolAddress = chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] as { teamDividendPool?: string })?.teamDividendPool
    : undefined

  const balance = dividendData?.account?.balance ?? '0'
  const balanceNum = parseFloat(balance)
  const history = dividendData?.history ?? []
  const currentMonth = dividendData?.currentMonth
  const estimated = currentMonth?.estimatedDividend ? parseFloat(currentMonth.estimatedDividend) : 0
  const netGrowth = currentMonth?.netGrowth ? parseFloat(currentMonth.netGrowth) : 0

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

  const isZh = locale.startsWith('zh')

  return (
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
          <Gift className="h-4 w-4 text-[#10b981]" />
          <span className="text-sm font-semibold text-[#f1f5f9]">
            {t('nodes.projectDividend') || (isZh ? '项目分红' : 'Project Dividend')}
          </span>
        </div>
      </div>

      {!isConnected ? (
        <p className="mt-4 text-[13px] text-[#64748b]">
          {isZh ? '连接钱包后查看您的节点等级与分红资格。' : 'Connect wallet to view your node level and dividend eligibility.'}
        </p>
      ) : isEligible ? (
        <>
          <div className="mt-4 text-sm text-[#94a3b8]">
            {isZh
              ? `您当前为 ${config?.code ?? ''}，已参与团队业绩分红。`
              : `You are ${config?.code ?? ''} and eligible for team performance dividends.`}
          </div>
          {estimated > 0 && (
            <div className="mt-3 rounded-xl border border-[#10b98120] bg-[#10b98110] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">
                  {isZh ? '本月预估分红' : 'Estimated dividend this month'}
                </span>
                <span className="font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#10b981]">
                  {estimated.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  USDT
                </span>
              </div>
              {netGrowth > 0 && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748b]">
                  <span>{isZh ? '本月净增业绩' : 'Net growth this month'}</span>
                  <span className="font-mono text-[#94a3b8]">
                    {netGrowth.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USDT
                  </span>
                </div>
              )}
            </div>
          )}
          {balanceNum > 0 && (
            <div className="mt-3 rounded-xl border border-[#10b98120] bg-[#10b98110] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">{isZh ? '可提取余额' : 'Withdrawable'}</span>
                <span className="font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#10b981]">
                  {balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
              </div>
              {poolAddress && (
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming}
                  className="mt-2 w-full rounded-lg border border-[#10b98140] bg-[#10b98120] py-2 text-sm font-medium text-[#10b981] transition hover:bg-[#10b98130] disabled:opacity-50"
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
              )}
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-[#64748b]">{isZh ? '历史记录' : 'History'}</p>
              <div className="mt-1 space-y-1">
                {history.slice(0, 5).map((h: { month: string; dividendAmount: string; status: string }) => (
                  <div key={h.month} className="flex justify-between text-[12px]">
                    <span className="text-[#94a3b8]">{h.month}</span>
                    <span className="font-mono text-[#10b981]">{parseFloat(h.dividendAmount).toFixed(2)} USDT</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-2 text-[12px] text-[#64748b] leading-relaxed">
            {isZh
              ? '分红按团队净增业绩和节点等级比例分配，每月 1 号结算。'
              : 'Dividends are settled monthly on the 1st based on team net growth and node level.'}
          </p>
          <Link
            href="/nodes"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#10b981] hover:underline"
          >
            {isZh ? '查看节点与等级' : 'View nodes & levels'}
            <span aria-hidden>→</span>
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 text-[13px] text-[#64748b]">
            {isZh ? '达到 L2 及以上节点等级即可参与项目分红。升级节点等级可解锁分红资格。' : 'Reach L2 or higher node level to participate in project dividends. Upgrade your node to unlock.'}
          </p>
          <Link
            href="/nodes"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#10b981] hover:underline"
          >
            {isZh ? '去升级节点' : 'Upgrade node'}
            <span aria-hidden>→</span>
          </Link>
        </>
      )}
    </div>
  )
}
