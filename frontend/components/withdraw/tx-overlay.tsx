'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useChainId } from 'wagmi'

function getExplorerTxUrl(chainId: number, hash: string): string {
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`
  if (chainId === 97) return `https://testnet.bscscan.com/tx/${hash}`
  return `https://testnet.bscscan.com/tx/${hash}`
}

interface Props {
  visible: boolean
  txHash?: string | string[]
}

export function TxOverlay({ visible, txHash }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const chainId = useChainId()

  if (!visible) return null

  const hashes = txHash == null ? [] : Array.isArray(txHash) ? txHash : [txHash]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#05050acc', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('withdraw.txTitle')}
    >
      <div
        className="flex w-80 flex-col items-center rounded-2xl border p-8 text-center"
        style={{ background: '#13131e', borderColor: '#ffffff1a' }}
      >
        {/* Spinner */}
        <div
          className="h-12 w-12 animate-spin rounded-full border-4"
          style={{ borderColor: '#1a1a2e', borderTopColor: '#00f5d4' }}
          aria-hidden="true"
        />

        <p className="mt-4 font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-[#f1f5f9]">
          {t('withdraw.txTitle')}
        </p>
        <p className="mt-2 text-[13px] text-[#64748b]">{t('withdraw.txSubtitle')}</p>

        {hashes.length > 0 && (
          <div className="mt-3 flex w-full flex-col items-center gap-2">
            {hashes.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">
                  {hashes.length > 1 ? `${t('withdraw.txLabel')} ${i + 1}: ` : t('withdraw.txLabel')}{' '}
                  {h.slice(0, 10)}...{h.slice(-8)}
                </span>
                <a
                  href={getExplorerTxUrl(chainId, h)}
                  className="text-xs font-medium text-[#00f5d4] transition-opacity hover:opacity-80 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('withdraw.viewBscscan')}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
