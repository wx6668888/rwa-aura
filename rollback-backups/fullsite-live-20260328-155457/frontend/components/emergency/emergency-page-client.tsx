'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { WarningCards } from '@/components/emergency/warning-cards'
import { ReturnCalculator } from '@/components/emergency/return-calculator'
import { ConfirmationSequence } from '@/components/emergency/confirmation-sequence'
import { EmergencyButton } from '@/components/emergency/emergency-button'
import { FaqAccordion } from '@/components/emergency/faq-accordion'
import { useStakingContract } from '@/hooks/useStakingContract'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

type BtnState = 'disabled' | 'enabled' | 'pending'

export function EmergencyPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected } = useAccount()
  const { stakingAddress, usdtLockedPrincipals, emergencyWithdraw, refetchUSDTLockedPrincipals } = useStakingContract()

  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const [btnState, setBtnState] = useState<BtnState>('disabled')
  const [errorMsg, setErrorMsg] = useState('')

  const confirmWord = t('emergency.confirmWord')
  const now = Math.floor(Date.now() / 1000)

  // 取第一个未提取且未到期的锁仓 USDT（含刚质押不足 1 天的，便于用户看到订单）
  const activeLock = useMemo(() => {
    if (!usdtLockedPrincipals) return null

    for (let index = 0; index < usdtLockedPrincipals.stakeIds.length; index++) {
      if (usdtLockedPrincipals.isWithdrawn[index]) continue

      const lockStart = usdtLockedPrincipals.lockStartTimes[index]
      const lockEnd = usdtLockedPrincipals.lockEndTimes[index]
      if (now >= lockEnd) continue

      const principalAmount = parseFloat(usdtLockedPrincipals.amounts[index] || '0')
      const elapsedDays = Math.floor((now - lockStart) / (24 * 3600))

      return {
        index,
        principalAmount,
        originalStakeAmount: principalAmount * 2,
        elapsedDays,
      }
    }

    return null
  }, [now, usdtLockedPrincipals])

  const { data: emergencyPreview } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingContractABI,
    functionName: 'getEmergencyWithdrawPreview',
    args: address != null && activeLock != null ? [address, BigInt(activeLock.index)] : undefined,
    query: {
      enabled: !!address && !!stakingAddress && activeLock != null,
    },
  })

  const activeLockPreview = useMemo(() => {
    if (activeLock == null) return null

    if (emergencyPreview != null) {
      return {
        ...activeLock,
        grossRefund: Number(emergencyPreview[0]) / 1e18,
        netRefund: Number(emergencyPreview[1]) / 1e18,
        elapsedDays: Number(emergencyPreview[2]),
        totalLockDays: Number(emergencyPreview[3]),
        eligible: Boolean(emergencyPreview[4]),
        feeAmount: Math.max(0, Number(emergencyPreview[0] - emergencyPreview[1]) / 1e18),
      }
    }

    return {
      ...activeLock,
      grossRefund: 0,
      netRefund: 0,
      elapsedDays: 0,
      totalLockDays: 0,
      eligible: false,
      feeAmount: 0,
    }
  }, [activeLock, emergencyPreview])

  const allDone = check1 && check2 && confirmValue === confirmWord && !!activeLockPreview?.eligible && isConnected

  useEffect(() => {
    if (activeLockPreview?.eligible || !isConnected) {
      setErrorMsg('')
      return
    }
    if (activeLockPreview != null && activeLock != null && (activeLock.elapsedDays ?? 0) < 1) {
      setErrorMsg(
        locale.startsWith('zh')
          ? '您有未到期锁仓 USDT 仓位，需至少完成 1 个自然日后才可申请紧急退出。'
          : 'You have a locked USDT position; emergency exit is available after at least 1 full day.'
      )
      return
    }
    setErrorMsg(
      locale.startsWith('zh')
        ? '当前没有可执行紧急退出的锁仓 USDT 仓位。仅“未到期且已完成至少 1 个整天”的锁仓仓位可用。'
        : 'No locked USDT position is currently eligible for emergency exit. Only positions that are still locked and have completed at least 1 full day can use it.'
    )
  }, [activeLockPreview, activeLock, isConnected, locale])

  // Keep button state in sync with form state
  function computeState(): BtnState {
    if (btnState === 'pending') return 'pending'
    return allDone ? 'enabled' : 'disabled'
  }

  async function handleWithdraw() {
    if (!allDone || !activeLockPreview) return

    try {
      setBtnState('pending')
      setErrorMsg('')
      await emergencyWithdraw(activeLockPreview.index)
      await refetchUSDTLockedPrincipals()
      setBtnState('disabled')
      setCheck1(false)
      setCheck2(false)
      setConfirmValue('')
    } catch (error: any) {
      setBtnState('enabled')
      setErrorMsg(error?.message || 'Emergency withdraw failed')
    }
  }

  return (
    <main className="min-h-screen bg-[#05050a] pb-[100px] font-sans">
      {/* Full-width red alert banner */}
      <div className="w-full bg-[#dc2626] px-4 py-4 text-center mt-16">
        <div className="mx-auto flex max-w-[580px] items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-white" />
          <h1 className="text-base font-bold text-white">
            {t('emergency.title').replace('⚠️ ', '')}
          </h1>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-[560px] px-4">

        {/* Warning cards */}
        <WarningCards t={t} />

        {/* Return calculator */}
        <ReturnCalculator 
          t={t} 
          stakeAmount={String(activeLockPreview?.originalStakeAmount ?? 0)}
          rewardsDeducted={String(activeLockPreview?.feeAmount ?? 0)}
          available={activeLockPreview?.grossRefund ?? 0}
          youReceive={activeLockPreview?.netRefund ?? 0}
        />

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] px-4 py-3 text-sm leading-relaxed text-[#fda4af]">
            {errorMsg}
          </div>
        )}

        {/* Confirmation sequence */}
        <ConfirmationSequence
          t={t}
          check1={check1}
          check2={check2}
          confirmValue={confirmValue}
          onCheck1={() => setCheck1((v) => !v)}
          onCheck2={() => setCheck2((v) => !v)}
          onConfirmChange={setConfirmValue}
        />

        {/* Emergency button */}
        <EmergencyButton
          state={computeState()}
          t={t}
          onClick={handleWithdraw}
        />

        {/* FAQ Accordion */}
        <FaqAccordion t={t} />

        {/* Bottom support note */}
        <p className="mt-8 text-center text-xs leading-relaxed text-[#64748b]">
          {t('emergency.support')}{' '}
          <a
            href="https://t.me/+nDdRxLhC6zkzNjhl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00f5d4] transition-opacity hover:opacity-80"
          >
            {t('emergency.supportLink')}
          </a>
        </p>
      </div>
    </main>
  )
}
