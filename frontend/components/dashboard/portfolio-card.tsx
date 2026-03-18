'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useStRWA } from '@/hooks/useStRWA'
import { useLevelInfo } from '@/hooks/useLevelInfo'
import { useTeamStats } from '@/hooks/useTeamStats'
import { NodeHexIcon } from '@/components/nodes/node-hex-icon'
import { getNodeLevelConfig, getNextLevelConfig, NODE_LEVELS } from '@/lib/node-levels'

function CircleProgress({ percent, size = 60, strokeWidth = 4 }: { percent: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1a1a2e"
          strokeWidth={strokeWidth}
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#00f5d4"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* center text - counter-rotate */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontFamily="'JetBrains Mono', monospace"
          fill="#00f5d4"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {percent}%
        </text>
      </svg>
    </div>
  )
}

function ProgressBar({ fill, label, value }: { fill: number; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#64748b]">{label}</span>
        <span className="font-mono text-[12px] text-[#64748b]">{value}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[#1a1a2e]">
        <div
          className="h-full rounded-full bg-[#00f5d4]"
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  )
}


/** 根据个人质押 + 团队总质押 + 总留存计算有效等级；团队总质押 = 团队量 + 个人质押；总留存 = 团队充值 - 团队提现 */
function computeEffectiveLevel(
  cumulativePersonalUsdt: number,
  teamVolumeOnlyUsdt: number,
  teamRetainedUsdt: number
): number {
  const teamTotalUsdt = teamVolumeOnlyUsdt + cumulativePersonalUsdt
  let level = 1
  for (let L = 2; L <= 9; L++) {
    const config = NODE_LEVELS.find((c) => c.level === L)
    if (!config) break
    if (
      cumulativePersonalUsdt >= config.personalStakeUSDT &&
      teamTotalUsdt >= config.teamVolumeUSDT &&
      teamRetainedUsdt >= (config.teamRetainedUSDT ?? 0)
    ) {
      level = L
    } else {
      break
    }
  }
  return level
}

export function PortfolioCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const { stRWABalance } = useStRWA()
  const teamStats = useTeamStats()
  
  // 优先从后端 API 读取质押数据
  const [apiData, setApiData] = useState<any>(null)
  useEffect(() => {
    if (!address) return
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
    
    // 优先尝试 v2 API（使用 user_stats 表，性能更好）
    fetch(`${API_BASE}/api/v2/portfolio/${address}`)
      .then(res => {
        if (!res.ok) throw new Error('v2 API failed')
        return res.json()
      })
      .then(json => {
        if (json.success) {
          console.log('[PortfolioCard] 使用 v2 API 数据（user_stats）')
          setApiData(json.data)
        } else {
          throw new Error('v2 API returned error')
        }
      })
      .catch(() => {
        // Fallback: 使用旧 API
        console.log('[PortfolioCard] v2 API 失败，fallback 到旧 API')
        fetch(`${API_BASE}/api/portfolio/${address}`)
          .then(res => res.json())
          .then(json => {
            if (json.success) setApiData(json.data)
          })
          .catch(() => {
            console.log('[PortfolioCard] 旧 API 也失败，使用链上数据')
          })
      })
  }, [address])

  // RWA 价格（用于转换）
  const rwaPrice = 0.85 // 1 RWA ≈ 0.85 USDT

  // 用户数据：优先使用链上实时数据，API作为fallback
  const usdtStaked = userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : (apiData ? parseFloat(apiData.usdtStaked) / 1e18 : 0)
  const rwaStaked = rwaStakeInfo?.totalStakedRWA ? parseFloat(rwaStakeInfo.totalStakedRWA) : (apiData ? parseFloat(apiData.rwaStaked) / 1e18 : 0)
  const usdtStakedInRWA = usdtStaked / rwaPrice // USDT 质押转换为 RWA
  const totalStakedRWA = usdtStakedInRWA + rwaStaked // 合并总质押（RWA）
  const totalStakedUSDT = totalStakedRWA * rwaPrice // 转换为 USDT 等值（用于小字显示）

  // 升级条件数据来源：全部使用链上数据
  const cumulativePersonalUsdt = totalStakedUSDT  // 链上个人质押
  const teamVolumeOnlyUsdt = teamStats.teamVolume - cumulativePersonalUsdt  // 链上团队下级质押
  const teamRetainedUsdt = teamStats.teamRetained  // 链上总留存
  const teamTotalUsdt = teamStats.teamVolume  // 链上团队总质押
  const effectiveLevel = computeEffectiveLevel(cumulativePersonalUsdt, teamVolumeOnlyUsdt, teamRetainedUsdt)

  const referrer = rwaStakeInfo?.referrer || userStakeInfo?.referrer || ''
  const hasReferrer = referrer && referrer !== '0x0000000000000000000000000000000000000000'
  const stRWABalanceNum = parseFloat(stRWABalance || '0')
  const firstStakeTime = rwaStakeInfo?.firstStakeTime || userStakeInfo?.firstStakeTime || 0

  // 节点等级配置：以有效等级显示徽章，进度显示到下一级
  const currentLevelConfig = getNodeLevelConfig(effectiveLevel) || getNodeLevelConfig(1)!
  const nextLevelConfig = getNextLevelConfig(effectiveLevel)

  const requiredPersonal = nextLevelConfig?.personalStakeUSDT ?? 0
  const requiredTeamVolume = nextLevelConfig?.teamVolumeUSDT ?? 0
  const requiredRetained = nextLevelConfig?.teamRetainedUSDT ?? 0
  const personalProgress = requiredPersonal > 0
    ? Math.min(100, (cumulativePersonalUsdt / requiredPersonal) * 100)
    : 0
  const teamProgress = requiredTeamVolume > 0
    ? Math.min(100, (teamTotalUsdt / requiredTeamVolume) * 100)
    : 0
  const retainedProgress = requiredRetained > 0
    ? Math.min(100, (teamRetainedUsdt / requiredRetained) * 100)
    : 0
  const overallProgress = nextLevelConfig
    ? Math.min(100, Math.min(personalProgress, teamProgress, retainedProgress))
    : 100

  // 格式化推荐人地址
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // BSCScan 链接
  const explorerUrl = chainId === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com'

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl"
      style={{
        border: '1px solid #00f5d420',
        boxShadow: '0 0 20px rgba(0,245,212,0.1)',
      }}
    >
      {/* Subtle inner glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(0,245,212,0.08) 0%, transparent 60%)' }}
      />

      {/* Label */}
      <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
        {t('portfolio.label')}
      </p>

      {/* Value */}
      <div className="mt-1 flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-5xl font-bold text-[#f1f5f9]">
            {isConnected ? totalStakedRWA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
          <span className="font-mono text-xl text-[#00f5d4]">RWA</span>
        </div>
        {isConnected && totalStakedRWA > 0 && (
          <p className="text-[13px] text-[#64748b]">
            ≈ ${totalStakedUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </p>
        )}
      </div>

      <div className="my-4 h-px bg-[#ffffff0d]" />

      {/* Node level row */}
      <div className="flex items-start justify-between">
        {/* Left: Hex badge */}
        <div className="flex flex-col items-center gap-2">
          <NodeHexIcon config={currentLevelConfig} size={56} showCode={false} />
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[11px] uppercase tracking-widest"
              style={{ color: currentLevelConfig.color, fontVariant: 'small-caps' }}
            >
              {currentLevelConfig.nameEn}
            </span>
            <span className="text-[9px] text-[#64748b] font-mono">
              {currentLevelConfig.code}
            </span>
          </div>
        </div>

        {/* Right: 到下一级进度 或 已满级 */}
        {effectiveLevel >= 9 ? (
          <div className="flex flex-col items-center gap-1">
            <CircleProgress percent={100} />
            <span className="mt-1 text-[11px] text-[#64748b]">
              {locale.startsWith('zh') ? '已满级' : 'Max level'}
            </span>
          </div>
        ) : nextLevelConfig ? (
          <div className="flex flex-col items-center gap-1">
            <CircleProgress percent={Math.round(overallProgress)} />
            <span className="mt-1 text-[11px] text-[#64748b]">
              {t('portfolio.to')} {nextLevelConfig.nameEn} ({nextLevelConfig.code})
            </span>
          </div>
        ) : null}
      </div>

      {/* Requirements：个人质押与团队总质押均为历史总业绩（累计），用于升级到下一级 */}
      {nextLevelConfig && (
        <div className="mt-4 flex flex-col gap-2">
          <p
            className="text-[11px] uppercase tracking-widest text-[#64748b]"
            style={{ fontVariant: 'small-caps' }}
          >
            {t('portfolio.requirements')}
          </p>
          {requiredPersonal > 0 && (
            <ProgressBar
              label={t('portfolio.personalStake') || '个人质押'}
              value={`${cumulativePersonalUsdt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${requiredPersonal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`}
              fill={personalProgress}
            />
          )}
          {requiredTeamVolume > 0 && (
            <ProgressBar
              label={t('portfolio.teamVolume') || '团队总质押'}
              value={`${teamTotalUsdt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${requiredTeamVolume.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`}
              fill={teamProgress}
            />
          )}
          {requiredRetained > 0 && (
            <ProgressBar
              label={t('portfolio.teamRetained') || '总留存'}
              value={`${teamRetainedUsdt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${requiredRetained.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`}
              fill={retainedProgress}
            />
          )}
        </div>
      )}

      {/* stRWA Balance */}
      {isConnected && stRWABalanceNum > 0 && (
        <>
          <div className="my-4 h-px bg-[#ffffff0d]" />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
              {t('portfolio.stRWABalance')}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#f59e0b]">
                {stRWABalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="font-mono text-sm text-[#f59e0b]">stRWA</span>
              <span className="font-mono text-[11px] text-[#64748b] ml-auto">
                = {stRWABalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]">{t('portfolio.stRWADesc')}</p>
          </div>
        </>
      )}

      {/* Investment Shares */}
      {isConnected && totalStakedRWA > 0 && (
        <>
          <div className="my-4 h-px bg-[#ffffff0d]" />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
              {t('portfolio.investmentShares')}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#f59e0b]">
                {(totalStakedRWA / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="font-mono text-sm text-[#f59e0b]">RWA</span>
              <span className="font-mono text-[11px] text-[#64748b] ml-auto">
                ≈ ${((totalStakedUSDT / 2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]">{t('portfolio.investmentSharesDesc')}</p>
          </div>
        </>
      )}

      {/* Referrer */}
      {isConnected && hasReferrer && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className="text-[12px] text-[#64748b]">{t('portfolio.referrer')}</span>
          <span className="font-mono text-[12px] text-[#f1f5f9]">{formatAddress(referrer)}</span>
          <a
            href={`${explorerUrl}/address/${referrer}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#00f5d4]"
          >
            <ExternalLink className="h-3 w-3 text-[#00f5d4]" />
          </a>
        </div>
      )}

      {/* 未连接钱包提示 */}
      {!isConnected && (
        <div className="mt-4 text-center text-sm text-[#64748b]">
          {t('portfolio.connectWalletToView')}
        </div>
      )}
    </div>
  )
}
