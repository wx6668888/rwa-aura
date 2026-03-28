'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Github, Check } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { bsc } from 'wagmi/chains'
import { CONTRACT_ADDRESSES, bscscanAddressUrl } from '@/lib/contracts/addresses'

const c = CONTRACT_ADDRESSES[bsc.id]

/** 与 frontend/lib/contracts/addresses.ts 单一数据源一致，避免新旧合约混用 */
const contracts = [
  {
    id: 'rwa',
    nameKey: 'RWA Token',
    descKey: 'RWA代币合约，支持动态卖出税和EIP-2612 Permit',
    address: c.rwaToken,
    bscscanUrl: bscscanAddressUrl(c.rwaToken),
    status: 'deployed' as const,
  },
  {
    id: 'staking',
    nameKey: 'Staking Contract',
    descKey: 'USDT/RWA质押合约，支持多种锁定期和推荐奖励',
    address: c.stakingContract,
    bscscanUrl: bscscanAddressUrl(c.stakingContract),
    status: 'deployed' as const,
  },
  {
    id: 'referral',
    nameKey: 'Referral Reward Pool',
    descKey: '推荐奖励池，管理推荐人奖励分配',
    address: c.ReferralRewardPool,
    bscscanUrl: bscscanAddressUrl(c.ReferralRewardPool),
    status: 'deployed' as const,
  },
  {
    id: 'usdt-rwa-swap',
    nameKey: 'USDT-RWA Swap (固定价)',
    descKey: 'USDT与RWA固定价格互换合约',
    address: c.usdtRwaSwap,
    bscscanUrl: bscscanAddressUrl(c.usdtRwaSwap),
    status: 'deployed' as const,
  },
  {
    id: 'swap',
    nameKey: 'Swap Contract',
    descKey: '协议内 Swap 合约',
    address: c.swapContract,
    bscscanUrl: bscscanAddressUrl(c.swapContract),
    status: 'deployed' as const,
  },
  {
    id: 'lottery',
    nameKey: 'Lottery Contract',
    descKey: '抽奖合约',
    address: c.lotteryContract,
    bscscanUrl: bscscanAddressUrl(c.lotteryContract),
    status: 'deployed' as const,
  },
  {
    id: 'usdt',
    nameKey: 'USDT Token',
    descKey: 'BSC主网USDT代币',
    address: c.usdtToken,
    bscscanUrl: bscscanAddressUrl(c.usdtToken),
    status: 'deployed' as const,
  },
  {
    id: 'strwa',
    nameKey: 'stRWA Token',
    descKey: '质押凭证代币',
    address: c.stRWA,
    bscscanUrl: bscscanAddressUrl(c.stRWA),
    status: 'deployed' as const,
  },
  {
    id: 'team-dividend',
    nameKey: 'Team Dividend Pool',
    descKey: '团队分红池',
    address: c.teamDividendPool,
    bscscanUrl: bscscanAddressUrl(c.teamDividendPool),
    status: 'deployed' as const,
  },
  {
    id: 'treasury',
    nameKey: 'Treasury Contract',
    descKey: '国库合约',
    address: c.treasuryContract,
    bscscanUrl: bscscanAddressUrl(c.treasuryContract),
    status: 'deployed' as const,
  },
]

export function ContractAddresses() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyAddress = (id: string, address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const truncateAddress = (address: string, isMobile: boolean) => {
    if (isMobile) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
    return address
  }

  return (
    <section className="mt-16">
      <p
        className="text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.contractAddresses')}
      </p>

      <div className="mt-6 rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-4 backdrop-blur-xl sm:p-6">
        <div className="space-y-4">
          {contracts.map((contract, index) => (
            <div
              key={contract.id}
              className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                index < contracts.length - 1 ? 'border-b border-[#ffffff0d]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-lg bg-[#13131e] px-2.5 py-1 sm:px-3">
                    <span className="text-[11px] font-semibold text-[#f1f5f9] sm:text-xs">
                      {contract.nameKey}
                    </span>
                  </div>
                  {contract.status === 'deployed' ? (
                    <span className="inline-flex items-center rounded-md bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10b981]">
                      已部署
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-medium text-[#f59e0b]">
                      待部署
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[#64748b] sm:mt-0.5 sm:text-xs">
                  {contract.descKey}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {contract.status === 'deployed' ? (
                  <>
                    <span className="hidden font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b] md:inline md:text-[13px]">
                      {contract.address}
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b] md:hidden">
                      {truncateAddress(contract.address, true)}
                    </span>

                    <button
                      onClick={() => copyAddress(contract.id, contract.address)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#ffffff1a] text-[#64748b] transition-colors hover:bg-[#13131e] hover:text-[#f1f5f9]"
                      aria-label="Copy address"
                    >
                      {copiedId === contract.id ? (
                        <Check className="h-4 w-4 text-[#10b981]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    <a
                      href={contract.bscscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#ffffff1a] text-[#64748b] transition-colors hover:bg-[#13131e] hover:text-[#00f5d4]"
                      aria-label="View on BSCScan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-[#64748b] italic">等待部署</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#ffffff0d] pt-4">
          <Github className="h-4 w-4 flex-shrink-0 text-[#64748b]" />
          <span className="text-xs text-[#64748b] sm:text-[13px]">{t('security.openSource')}</span>
          <a
            href="https://github.com/rwa-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00f5d4] transition-colors hover:underline sm:text-[13px]"
          >
            {t('security.viewSource')} →
          </a>
        </div>
      </div>
    </section>
  )
}
