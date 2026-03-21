'use client'

import { Info } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

type WithdrawMode = 'withdrawU' | 'holdRWA'

interface Props {
  mode: WithdrawMode
  onModeChange: (mode: WithdrawMode) => void
  amount: string
  /** 当前提取的本金资产类型，用于说明框内显示 USDT 或 RWA */
  principalAsset?: 'usdt' | 'rwa'
  /** 是否允许选择 stRWA（仅 RWA 本金支持） */
  allowStRWA?: boolean
}

export function WithdrawModeSelector({ mode, onModeChange, amount, principalAsset = 'rwa', allowStRWA = true }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const numAmount = parseFloat((amount || '').replace(/,/g, '')) || 0
  const unit = principalAsset === 'usdt' ? 'USDT' : 'RWA'

  const buybackBurnAmount = numAmount * 0.03
  const treasuryAmount = numAmount * 0.03
  const communityAmount = numAmount * 0.02
  const protocolFee = numAmount * 0.08
  const withdrawUAmount = Math.max(0, numAmount - protocolFee)
  const holdRWAAmount = numAmount * 1.2
  const withdrawModeHint = locale.startsWith('zh')
    ? '立即到账扣 8%，实收 92%；stRWA 不扣费，得 120% 锁 30 天。'
    : 'Immediate: 8% fee, 92% received. stRWA: 0% fee, 120% locked 30 days.'
  const holdModeHint = withdrawModeHint

  return (
    <div className="rounded-xl border border-[#ffffff14] bg-transparent p-4">
      <p className="text-xs font-medium text-[#f1f5f9]">
        {t('withdraw.modeSelect')}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Withdraw-U Mode */}
        <button
          type="button"
          onClick={() => onModeChange('withdrawU')}
          className={`rounded-xl border bg-transparent p-4 text-left transition-colors ${
            mode === 'withdrawU'
              ? 'border-[#00f5d4]'
              : 'border-[#ffffff1a] hover:border-[#ffffff2e]'
          }`}
        >
          <span className="text-sm font-semibold text-[#f1f5f9]">{t('withdraw.modeWithdrawU')}</span>
          <p className="mt-1 text-xs text-[#64748b]">{t('withdraw.modeWithdrawUDesc')}</p>
          {numAmount > 0 && (
            <div className="mt-3 space-y-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">
              <div className="flex items-center justify-between">
                <span>{t('withdraw.withdrawAmount')}</span>
                <span className="text-[#94a3b8]">{numAmount.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('withdraw.feeCharge')}</span>
                <span className="text-[#94a3b8]">−{protocolFee.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('withdraw.actualReceived')}</span>
                <span className="text-[#94a3b8]">{withdrawUAmount.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{locale.startsWith('zh') ? '回购/销毁（3%）' : 'Buyback/burn (3%)'}</span>
                <span className="text-[#94a3b8]">−{buybackBurnAmount.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{locale.startsWith('zh') ? 'Treasury（3%）' : 'Treasury (3%)'}</span>
                <span className="text-[#94a3b8]">−{treasuryAmount.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{locale.startsWith('zh') ? '社区池（2%）' : 'Community pool (2%)'}</span>
                <span className="text-[#94a3b8]">−{communityAmount.toFixed(2)} {unit}</span>
              </div>
            </div>
          )}
        </button>

        {/* Hold-RWA Mode (stRWA)：仅 RWA 本金可选 */}
        <button
          type="button"
          disabled={!allowStRWA}
          onClick={() => allowStRWA && onModeChange('holdRWA')}
          aria-disabled={!allowStRWA}
          className={`rounded-xl border bg-transparent p-4 text-left transition-colors ${
            !allowStRWA
              ? 'cursor-not-allowed border-[#ffffff0d] opacity-60'
              : mode === 'holdRWA'
                ? 'border-[#00f5d4]'
                : 'border-[#ffffff1a] hover:border-[#ffffff2e]'
          }`}
        >
          <span className="text-sm font-semibold text-[#f1f5f9]">{t('withdraw.modeHoldRWA')}</span>
          <p className="mt-1 text-xs text-[#64748b]">{t('withdraw.modeHoldRWADesc')}</p>
          {numAmount > 0 && (
            <div className="mt-3 space-y-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">
              <div className="flex items-center justify-between">
                <span>{t('withdraw.withdrawAmount')}</span>
                <span className="text-[#94a3b8]">{numAmount.toFixed(2)} {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{locale.startsWith('zh') ? '立即到账手续费' : 'Immediate-exit fee'}</span>
                <span className="text-[#94a3b8]">0.00 {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('withdraw.getStRWA')}</span>
                <span className="text-[#94a3b8]">{holdRWAAmount.toFixed(2)} stRWA</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('withdraw.lockPeriod')}</span>
                <span className="text-[#94a3b8]">{t('withdraw.lockPeriod30Days')}</span>
              </div>
            </div>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#ffffff14] bg-transparent p-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64748b]" />
        <p className="text-[11px] leading-relaxed text-[#64748b]">
          {mode === 'withdrawU' ? withdrawModeHint : holdModeHint}
        </p>
      </div>
    </div>
  )
}
