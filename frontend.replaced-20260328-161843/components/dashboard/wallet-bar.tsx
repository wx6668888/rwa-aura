'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export function WalletBar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address } = useAccount()
  const [copied, setCopied] = useState(false)

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '0x1234...5678'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function handleCopy() {
    if (address) {
      navigator.clipboard.writeText(address).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="w-full border-b border-[#00f5d420] bg-[#0d0d14] px-4 sm:px-6 mt-16" style={{ minHeight: 48 }}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between py-2">
        {/* Left: address + network */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pulsing cyan dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-dot-pulse absolute inline-flex h-full w-full rounded-full bg-[#00f5d4] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00f5d4]" />
          </span>

          {/* Address chip */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md border border-[#00f5d420] bg-[#13131e] px-2 py-1.5 sm:px-3 transition-colors hover:border-[#00f5d440] min-h-[44px]"
            aria-label="Copy wallet address"
          >
            <span className="font-mono text-xs text-[#f1f5f9]">
              {formatAddress(address)}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#00f5d4]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#00f5d4]" />
            )}
          </button>

          {/* Network pill */}
          <span className="rounded-full border border-[#00f5d420] bg-[#1a1a2e] px-2 py-1 font-mono text-[11px] text-[#00f5d4]">
            {t('wallet.network')}
          </span>
        </div>

        {/* Right: disconnect */}
        <button
          type="button"
          className="text-[12px] text-[#00f5d4] transition-colors hover:text-[#f1f5f9] min-h-[44px] px-2"
        >
          {t('wallet.disconnect')}
        </button>
      </div>
    </div>
  )
}
