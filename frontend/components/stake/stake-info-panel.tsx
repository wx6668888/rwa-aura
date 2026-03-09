'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { NODE_LEVELS } from '@/lib/node-levels'

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
  const entryLevel = NODE_LEVELS[0] // L1 入门等级

  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
        {t('info.title')}
      </p>
      {/* Block 1 — Pool Balance */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.poolLabel')}
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-3xl font-medium"
          style={{ color: '#00f5d4' }}
        >
          {t('info.poolValue')}
        </p>
        {/* Pool health bar */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1a1a2e]">
          <div
            className="h-full rounded-full bg-[#00f5d4]"
            style={{ width: '84%', boxShadow: '0 0 8px rgba(0,245,212,0.25)' }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-[#64748b]">{t('info.poolUsed')}</span>
          <span className="text-[11px] text-[#10b981]">{t('info.poolCapacity')}</span>
        </div>
      </div>

      <div className="my-5 border-t border-[#ffffff0d]" />

      {/* Block 2 — Daily Yield */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.yieldLabel')}
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-space-grotesk)] text-[52px] font-black leading-none"
          style={{ color: '#00f5d4' }}
        >
          {t('info.yieldValue')}
        </p>
        <p className="mt-1 text-[13px] text-[#64748b]">{t('info.yieldSub')}</p>
      </div>

      <div className="my-5 border-t border-[#ffffff0d]" />

      {/* Block 3 — Sell Tax */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('info.taxLabel')}
        </p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          <div className="flex-[2] rounded-l-full bg-[#00f5d4]" style={{ boxShadow: '0 0 6px rgba(0,245,212,0.25)' }} />
          <div className="flex-[1] bg-[#f43f5e]" />
          <div className="flex-[1] rounded-r-full bg-[#7c3aed]" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[#64748b]">{t('info.taxTreasury')}</span>
          <span className="text-xs text-[#f43f5e]">{t('info.taxBurn')}</span>
          <span className="text-xs text-[#7c3aed]">{t('info.taxLiquidity')}</span>
        </div>
      </div>

      <div className="my-5 border-t border-[#ffffff0d]" />

      {/* Block 4 — Node Level (L1–L9) */}
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
    </div>
  )
}
