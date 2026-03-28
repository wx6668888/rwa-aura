'use client'

interface Props {
  t: (key: string) => string
  stakeAmount?: string
  rewardsDeducted?: string
  onStakeAmountChange?: (value: string) => void
  onRewardsDeductedChange?: (value: string) => void
  available?: number
  youReceive?: number
}

export function ReturnCalculator({
  t,
  stakeAmount = '1000',
  rewardsDeducted = '40',
  available = 100,
  youReceive = 92,
}: Props) {
  return (
    <div
      className="mt-4 border border-[#10b981] bg-[#0d0d14] p-6"
      style={{ borderRadius: '0.75rem' }}
    >
      <div className="mt-4 flex flex-col gap-3 font-mono text-[13px]">
        {/* Row: original staked */}
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">{t('emergency.calcStaked')}</span>
          <span className="text-[#f1f5f9]">{Number(stakeAmount).toFixed(2)} USDT</span>
        </div>

        {/* Row: gross refund before fee */}
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">{t('emergency.calcAvail')}</span>
          <span className="text-[#64748b]">{available.toFixed(2)} USDT</span>
        </div>

        {/* Row: immediate exit fee */}
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">{t('emergency.calcDeduct')}</span>
          <span className="text-[#f43f5e]">−{Number(rewardsDeducted).toFixed(2)} USDT</span>
        </div>

        {/* Divider */}
        <div className="my-1 h-px bg-[#ffffff0d]" />

        {/* Row: you receive */}
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold text-[#f1f5f9]">
            {t('emergency.youReceive')}
          </span>
          <span
            className="text-[28px] font-bold leading-none text-[#10b981]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {youReceive.toFixed(2)} USDT
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
        {t('emergency.calcNote')}
      </p>
    </div>
  )
}
