'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ExternalLink, Info } from 'lucide-react'
import { useAccount, useChainId, useReadContract } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { treasuryContractABI } from '@/lib/contracts/treasuryContractABI'

function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function InvestmentSharesCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { userStakeInfo } = useStakingContract()

  // Get Treasury contract address
  const treasuryAddress = chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.treasuryContract

  // Read investment share from Treasury contract
  const { data: investmentShare, refetch: refetchInvestmentShare } = useReadContract({
    address: treasuryAddress as `0x${string}` | undefined,
    abi: treasuryContractABI,
    functionName: 'getUserInvestmentShare',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!treasuryAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })

  // Calculate investment share from staked amount (50% of total staked)
  const totalStaked = userStakeInfo?.totalStaked || '0'
  const totalStakedNum = parseFloat(totalStaked)
  const calculatedInvestmentShares = totalStakedNum / 2 // 50% of stake

  // Use contract data if available, otherwise use calculated value
  // Note: USDT uses 6 decimals, not 18
  const investmentSharesNum = investmentShare 
    ? parseFloat(investmentShare.toString()) / 1e6 // Convert from USDT (6 decimals)
    : calculatedInvestmentShares

  // Get total investment shares and returns (for percentage calculation)
  const { data: totalShares } = useReadContract({
    address: treasuryAddress as `0x${string}` | undefined,
    abi: treasuryContractABI,
    functionName: 'getTotalInvestmentShares',
    query: {
      enabled: !!treasuryAddress,
      refetchInterval: 30000,
    },
  })

  const { data: totalReturns } = useReadContract({
    address: treasuryAddress as `0x${string}` | undefined,
    abi: treasuryContractABI,
    functionName: 'totalReturns',
    query: {
      enabled: !!treasuryAddress,
      refetchInterval: 30000,
    },
  })

  // Calculate user's share percentage
  const totalSharesNum = totalShares ? parseFloat(totalShares.toString()) / 1e6 : 0 // USDT uses 6 decimals
  const userSharePercentage = totalSharesNum > 0 
    ? (investmentSharesNum / totalSharesNum) * 100 
    : 0

  // Calculate estimated dividend (40% of returns * user's share)
  const totalReturnsNum = totalReturns ? parseFloat(totalReturns.toString()) / 1e6 : 0 // USDT uses 6 decimals
  const estimatedDividend = totalReturnsNum > 0 
    ? (totalReturnsNum * 0.4) * (userSharePercentage / 100) // 40% of returns to users
    : 0

  // BSCScan link
  const explorerUrl = chainId === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com'

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: '#0d0d14',
        borderColor: '#f59e0b40',
        boxShadow: '0 0 0 1px #f59e0b20, 0 8px 32px #f59e0b10',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
          <span className="text-sm font-semibold text-[#f1f5f9]">
            {t('withdraw.investmentShares') || 'Investment Shares'}
          </span>
        </div>
        {treasuryAddress && (
          <a
            href={`${explorerUrl}/address/${treasuryAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#f59e0b] transition-colors"
          >
            <span className="font-mono">{formatAddress(treasuryAddress)}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Investment Shares Value */}
      <div className="mt-4">
        <p className="text-xs text-[#64748b]">
          {t('withdraw.yourInvestmentShare') || 'Your Investment Share'}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[32px] font-bold text-[#f59e0b]">
            {isConnected 
              ? investmentSharesNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '0.00'}
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg text-[#f59e0b]">USDT</span>
        </div>
        {userSharePercentage > 0 && (
          <p className="mt-1 text-xs text-[#64748b]">
            {t('withdraw.sharePercentage', { percentage: userSharePercentage.toFixed(4) }) || 
             `${userSharePercentage.toFixed(4)}% of total investment shares`}
          </p>
        )}
      </div>

      {/* Description */}
      <p className="mt-3 text-[12px] text-[#64748b] leading-relaxed">
        {t('withdraw.investmentSharesDesc') || 
         '50% of your staked amount is allocated to Treasury for real-world asset investments. You will receive 40% of investment returns as dividends.'}
      </p>

      {/* Dividend Info */}
      {isConnected && investmentSharesNum > 0 && (
        <div className="mt-4 rounded-xl border border-[#f59e0b20] bg-[#f59e0b10] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#f59e0b]">
                {t('withdraw.estimatedDividend') || 'Estimated Dividend'}
              </p>
              <p className="mt-1 text-[11px] text-[#64748b]">
                {t('withdraw.dividendDesc') || '40% of Treasury investment returns'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-[#f59e0b]">
                {estimatedDividend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="ml-1 font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f59e0b]">USDT</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#00f5d420] bg-[#00f5d410] p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00f5d4]" />
        <p className="text-[11px] leading-relaxed text-[#64748b]">
          {t('withdraw.investmentSharesInfo') || 
           'Investment shares are calculated as 50% of your total staked amount. Dividends are distributed monthly based on Treasury investment returns.'}
        </p>
      </div>
    </div>
  )
}
