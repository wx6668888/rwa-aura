'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { NODE_LEVELS } from '@/lib/node-levels'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { formatUsdAmount, formatUsdFull } from '@/lib/stats-display'

function HexBadge({ label, color }: { label: string; color: string }) {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points="20,2 37,11 37,29 20,38 3,29 3,11"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      </svg>
      <span
        className="relative font-[family-name:var(--font-space-grotesk)] text-xs font-bold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

export function StakeInfoPanelContent() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()
  const entryLevel = NODE_LEVELS[0]

  const poolUsd = formatUsdFull(data.rewardPoolUsdt)
  const usagePct = Math.min(100, Math.max(0, Number(data.rewardUsagePercent) || 0))
  const remainingUsd = formatUsdAmount(data.remainingRewardCapUsdt, false)
  const tvlUsd = formatUsdAmount(data.tvlUsdt, false)

  const updatedLabel =
    data.updatedAt > 0
      ? new Date(data.updatedAt).toLocaleString(locale?.startsWith('zh') ? 'zh-CN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '—'

  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
        {t('info.title')}
      </p>
      {/* 社区激励池余额（/api/stats/analytics 链上池子余额 + 使用占比） */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.poolLabel')}
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-2xl font-semibold sm:text-3xl"
          style={{ color: '#00f5d4' }}
        >
          {poolUsd}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1a1a2e]">
          <div
            className="h-full rounded-full bg-[#00f5d4] transition-[width] duration-500"
            style={{ width: `${usagePct}%`, boxShadow: '0 0 8px rgba(0,245,212,0.25)' }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-[#64748b]">
          <span>
            {t('info.poolUsed')} {usagePct.toFixed(0)}% · {locale?.startsWith('zh') ? '剩余额度' : 'Remaining'}{' '}
            <span className="font-mono text-[#94a3b8]">{remainingUsd}</span>
          </span>
          <span className={usagePct >= 90 ? 'text-amber-400' : 'text-[#10b981]'}>
            {usagePct >= 90
              ? locale?.startsWith('zh')
                ? '余量偏紧'
                : 'Tight headroom'
              : locale?.startsWith('zh')
                ? '余量充足'
                : 'Adequate headroom'}
          </span>
        </div>
      </div>

      <div className="my-4 border-t border-[#ffffff0d]" />

      {/* 协议 TVL（索引 / 链上统计） */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {locale?.startsWith('zh') ? '协议总 TVL（估算）' : 'Protocol TVL (est.)'}
        </p>
        <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-lg font-medium text-[#e2e8f0]">{tvlUsd}</p>
        <p className="mt-0.5 text-[10px] text-[#475569]">
          {locale?.startsWith('zh') ? '数据来自站点统计 API，约每分钟刷新' : 'From site stats API, refreshes ~every minute'}
        </p>
      </div>

      <div className="my-4 border-t border-[#ffffff0d]" />

      {/* 每日收益（产品规则与合约一致，展示固定基准） */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.yieldLabel')}
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-space-grotesk)] text-4xl font-black leading-none sm:text-[52px]"
          style={{ color: '#00f5d4' }}
        >
          {t('info.yieldValue')}
        </p>
        <p className="mt-1 text-[13px] text-[#64748b]">{t('info.yieldSub')}</p>
      </div>

      <div className="my-4 border-t border-[#ffffff0d]" />

      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.taxLabel')}
        </p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          <div className="flex-[2] rounded-l-full bg-[#00f5d4]" style={{ boxShadow: '0 0 6px rgba(0,245,212,0.25)' }} />
          <div className="flex-[1] bg-[#f43f5e]" />
          <div className="flex-[1] rounded-r-full bg-[#7c3aed]" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <span className="text-xs text-[#64748b]">{t('info.taxTreasury')}</span>
          <span className="text-xs text-[#f43f5e]">{t('info.taxBurn')}</span>
          <span className="text-xs text-[#7c3aed]">{t('info.taxLiquidity')}</span>
        </div>
      </div>

      <div className="my-4 border-t border-[#ffffff0d]" />

      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.levelLabel')}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <HexBadge label={entryLevel.code} color={entryLevel.color} />
          <div>
            <p className="text-sm font-bold" style={{ color: entryLevel.color }}>
              {locale?.startsWith('zh') ? entryLevel.name : entryLevel.nameEn}
            </p>
            <p className="text-xs text-[#64748b]">
              {entryLevel.rewardPercentage}% {t('info.levelRateSuffix')} · L1–L9
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] text-[#475569]">
        {locale?.startsWith('zh') ? '上次同步：' : 'Last updated: '}
        {updatedLabel}
      </p>
    </div>
  )
}
