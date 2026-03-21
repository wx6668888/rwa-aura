'use client'

import { useRouter } from 'next/navigation'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useStakesContext } from '@/contexts/StakesContext'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { ReferralRewardDetails } from './referral-reward-details'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatUnits } from 'viem'

interface StakeEarning {
  stakeId: string
  amount: number
  lockPeriod: string
  elapsedDays: number
  dailyRate: number
  rwaEarning: number
  timestamp: number
  isRWAStake?: boolean
}

export function EarningsCardBackup2() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const router = useRouter()
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const { userRewards, userStakeInfo, refetchRewards, rwaStakeInfo, refetchRWAStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  const { stakes, loading: stakesLoading, refetch: refetchStakes } = useStakesContext()
  const { rewards: referralRewards } = useReferralRewards()
  // 原始实现完整拷贝自 earnings-card.tsx（略）
}

