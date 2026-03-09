'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Github, Check } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const contracts = [
  {
    id: 'staking',
    nameKey: 'security.contractStakingName',
    descKey: 'security.contractStakingDesc',
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    bscscanUrl: 'https://bscscan.com/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  },
  {
    id: 'rwa',
    nameKey: 'security.contractRWAName',
    descKey: 'security.contractRWADesc',
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    bscscanUrl: 'https://bscscan.com/address/0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
  {
    id: 'treasury',
    nameKey: 'security.contractTreasuryName',
    descKey: 'security.contractTreasuryDesc',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    bscscanUrl: 'https://bscscan.com/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
  {
    id: 'timelock',
    nameKey: 'security.contractTimelockName',
    descKey: 'security.contractTimelockDesc',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    bscscanUrl: 'https://bscscan.com/address/0x5FbDB2315678afecb367f032d93F642f64180aa3',
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
                <div className="inline-flex items-center rounded-lg bg-[#13131e] px-2.5 py-1 sm:px-3">
                  <span className="text-[11px] font-semibold text-[#f1f5f9] sm:text-xs">
                    {t(contract.nameKey)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#64748b] sm:mt-0.5 sm:text-xs">
                  {t(contract.descKey)}
                </p>
              </div>

              <div className="flex items-center gap-2">
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
