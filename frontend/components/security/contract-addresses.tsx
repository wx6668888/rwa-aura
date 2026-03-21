'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Github, Check } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const contracts = [
  {
    id: 'rwa',
    nameKey: 'RWA Token',
    descKey: 'RWA代币合约，支持动态卖出税和EIP-2612 Permit',
    address: '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812',
    bscscanUrl: 'https://bscscan.com/address/0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812',
    status: 'deployed',
  },
  {
    id: 'staking',
    nameKey: 'Staking Contract',
    descKey: 'USDT/RWA质押合约，支持多种锁定期和推荐奖励',
    address: '0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175',
    bscscanUrl: 'https://bscscan.com/address/0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175',
    status: 'deployed',
  },
  {
    id: 'referral',
    nameKey: 'Referral Reward Pool',
    descKey: '推荐奖励池，管理推荐人奖励分配',
    address: '0x5DC995e0B3662F8071001F9454FDcAD47D4A4151',
    bscscanUrl: 'https://bscscan.com/address/0x5DC995e0B3662F8071001F9454FDcAD47D4A4151',
    status: 'deployed',
  },
  {
    id: 'swap',
    nameKey: 'USDT-RWA Swap',
    descKey: 'USDT和RWA固定价格兑换合约',
    address: '0xE6812B78091D64D983079B375c9afEfF9d2EB764',
    bscscanUrl: 'https://bscscan.com/address/0xE6812B78091D64D983079B375c9afEfF9d2EB764',
    status: 'deployed',
  },
  {
    id: 'lottery',
    nameKey: 'Lottery Contract',
    descKey: '抽奖合约，提供多种抽奖机制',
    address: '0xD4Fce5360C56200ca299EF53E13904dAf1b1662c',
    bscscanUrl: 'https://bscscan.com/address/0xD4Fce5360C56200ca299EF53E13904dAf1b1662c',
    status: 'deployed',
  },
  {
    id: 'usdt',
    nameKey: 'USDT Token',
    descKey: 'BSC主网USDT代币',
    address: '0x55d398326f99059fF775485246999027B3197955',
    bscscanUrl: 'https://bscscan.com/address/0x55d398326f99059fF775485246999027B3197955',
    status: 'deployed',
  },
  {
    id: 'strwa',
    nameKey: 'stRWA Token',
    descKey: '质押凭证代币，代表质押的RWA',
    address: '',
    bscscanUrl: '',
    status: 'pending',
  },
  {
    id: 'team-dividend',
    nameKey: 'Team Dividend Pool',
    descKey: '团队分红池，管理团队奖励分配',
    address: '',
    bscscanUrl: '',
    status: 'pending',
  },
  {
    id: 'treasury',
    nameKey: 'Treasury Contract',
    descKey: '国库合约，管理协议资金',
    address: '',
    bscscanUrl: '',
    status: 'pending',
  },
  {
    id: 'emergency',
    nameKey: 'Emergency Pause',
    descKey: '紧急暂停合约，用于安全控制',
    address: '',
    bscscanUrl: '',
    status: 'pending',
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
                    {/* Desktop: full address */}
                    <span className="hidden font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b] md:inline md:text-[13px]">
                      {contract.address}
                    </span>
                    {/* Mobile: truncated */}
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b] md:hidden">
                      {truncateAddress(contract.address, true)}
                    </span>

                    {/* Copy button */}
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

                    {/* BSCScan link */}
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
                  <span className="text-xs text-[#64748b] italic">
                    等待部署
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* GitHub link */}
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
