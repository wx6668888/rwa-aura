'use client'

import { useState, useMemo } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { bsc } from 'wagmi/chains'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES, bscscanAddressUrl } from '@/lib/contracts/addresses'
import { shortenAddress } from '@/lib/stats-display'

export function FooterSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)

  const stakingAddress = CONTRACT_ADDRESSES[bsc.id].stakingContract
  const short = useMemo(() => shortenAddress(stakingAddress), [stakingAddress])
  const explorerUrl = bscscanAddressUrl(stakingAddress)

  function handleCopy() {
    navigator.clipboard.writeText(stakingAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="border-t border-[#ffffff0d] pb-8 pt-12 mt-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-space-grotesk)] text-base font-bold">
            <span className="text-[#00f5d4]">RWA</span>
            <span className="mx-2 inline-block h-3 w-px bg-[#ffffff1a] align-middle" />
            <span className="text-[#64748b] tracking-wider text-sm">PROTOCOL</span>
          </span>
          <span className="text-[12px] text-[#64748b]">{t('footer.copyright')}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#64748b]">{t('footer.contractLabel')}</span>
          <span className="font-mono text-[12px] text-[#f1f5f9]">{short}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="复制合约地址"
            className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在 BSCScan 查看合约"
            className="rounded p-1 text-[#64748b] transition-colors hover:text-[#00f5d4]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
