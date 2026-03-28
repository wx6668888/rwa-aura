'use client'

import { Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import { bsc } from 'wagmi/chains'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useMemo, useState } from 'react'
import { CONTRACT_ADDRESSES, bscscanTokenUrl } from '@/lib/contracts/addresses'
import { shortenAddress } from '@/lib/stats-display'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rwa.lat'

export function StatsPanel() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)

  const rwaAddress = CONTRACT_ADDRESSES[bsc.id].rwaToken
  const rwaShort = useMemo(() => shortenAddress(rwaAddress), [rwaAddress])
  const pancakeSwapUrl = `https://pancakeswap.finance/swap?outputCurrency=${rwaAddress}`

  const handleCopy = () => {
    navigator.clipboard.writeText(rwaAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5 rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] p-5 backdrop-blur-xl lg:sticky lg:top-24">
      {/* Block 1: Token Stats */}
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
          {t('market.tokenInfo')}
        </h3>
        <div className="mt-3 space-y-3">
          <StatRow label={t('market.totalSupply')} value="10,000,000 RWA" />
          <StatRow label={t('market.circulatingSupply')} value="8,524,000 RWA" />
          <StatRow label={t('market.circulatingMarketCap')} value="$8,524,000" />
          <StatRow label={t('market.fullyDilutedMarketCap')} value="$10,000,000" />
          <StatRow label={t('market.holders')} value="8,432" />
          <div className="flex items-center justify-between border-b border-[#ffffff0d] pb-3">
            <span className="text-xs text-[#64748b]">{t('market.contractAddress')}</span>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#f1f5f9]">
                {rwaShort}
              </span>
              <button
                onClick={handleCopy}
                className="text-[#64748b] transition-colors hover:text-[#00f5d4]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Block 2: 24H Price Range */}
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
          {t('market.priceRange24h')}
        </h3>
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a2e]">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: '63%',
                background: 'linear-gradient(to right, #f43f5e, #10b981)',
              }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#00f5d4] shadow-lg"
              style={{ left: '63%', boxShadow: '0 0 8px #00f5d440' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#f43f5e]">
              $0.8102
            </span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#10b981]">
              $0.8901
            </span>
          </div>
        </div>
      </div>

      {/* Block 3: Transaction Tax */}
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
          {t('market.transactionTax')}
        </h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748b]">{t('market.buyTax')}</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold text-[#10b981]">
              0%
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748b]">{t('market.sellTax')}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold text-[#f1f5f9]">
                20%
              </span>
            </div>
            <div className="mt-2 space-y-1.5 pl-4">
              <TaxBreakdown color="#00f5d4" label={t('market.taxTreasury')} value="10%" />
              <TaxBreakdown color="#f43f5e" label={t('market.taxBurn')} value="5%" />
              <TaxBreakdown color="#8b5cf6" label={t('market.taxLiquidity')} value="5%" />
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full">
              <div className="w-1/2 bg-[#00f5d4]" />
              <div className="w-1/4 bg-[#f43f5e]" />
              <div className="w-1/4 bg-[#8b5cf6]" />
            </div>
          </div>
          <div className="flex gap-2 rounded-lg border border-[#fb923c33] bg-[#fb923c1a] p-3">
            <AlertTriangle className="h-3 w-3 shrink-0 text-[#fb923c]" />
            <span className="text-[11px] leading-relaxed text-[#fb923c]">
              {t('market.taxWarning')}
            </span>
          </div>
        </div>
      </div>

      {/* Block 4: Links */}
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
          {t('market.relatedLinks')}
        </h3>
        <div className="mt-3 space-y-2">
          <LinkItem label={t('market.linkPancakeswap')} href={pancakeSwapUrl} />
          <LinkItem label={t('market.linkBscscan')} href={bscscanTokenUrl(rwaAddress)} />
          <LinkItem label={t('market.linkAddToWallet')} href={pancakeSwapUrl} />
          <LinkItem label={t('market.linkWebsite')} href={APP_URL} />
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#ffffff0d] pb-3 last:border-0">
      <span className="text-xs text-[#64748b]">{label}</span>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#f1f5f9]">
        {value}
      </span>
    </div>
  )
}

function TaxBreakdown({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-[#64748b]">{label}</span>
      </div>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#f1f5f9]">
        {value}
      </span>
    </div>
  )
}

function LinkItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-[13px] text-[#64748b] transition-colors hover:text-[#00f5d4]"
    >
      <ExternalLink className="h-3 w-3" />
      <span>{label}</span>
    </a>
  )
}
