'use client'

import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { useChainId } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface Props {
  show: boolean
  status: 'waiting' | 'pending' | 'success' | 'error'
  txHash?: string | null
  fromAmount?: string
  toAmount?: string
  fromToken?: string
  toToken?: string
  error?: string | null
  onClose: () => void
}

export function SwapTransactionOverlay({
  show,
  status,
  txHash,
  fromAmount,
  toAmount,
  fromToken = 'USDT',
  toToken = 'RWA',
  error,
  onClose,
}: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const chainId = useChainId()
  const explorerBase = chainId === 97 ? 'https://testnet.bscscan.com' : 'https://bscscan.com'

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,9,14,0.9)] backdrop-blur-[30px] animate-in fade-in duration-300">
      <div className="relative w-[380px] bg-gradient-to-br from-[#13131e] to-[#0d0d14] border border-[rgba(0,255,200,0.2)] rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,200,0.15)] animate-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,255,200,0.05)] to-transparent rounded-3xl opacity-50" />

        <div className="relative z-10">
          {status === 'waiting' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#00ffc8] animate-spin" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">{t('swap.overlayWaitingTitle')}</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.6)] mb-4">{t('swap.overlayWaitingHint')}</p>
              {fromAmount && toAmount && (
                <div className="rounded-xl bg-[rgba(0,255,200,0.05)] border border-[rgba(0,255,200,0.1)] px-4 py-3 text-left space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">{t('swap.payLabel')}</span>
                    <span className="font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {fromAmount} {fromToken}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">{t('swap.receiveLabel')}</span>
                    <span className="font-[600] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {toAmount} {toToken}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] rounded-full opacity-20 animate-ping" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-[rgba(0,255,200,0.2)] border-t-[#00ffc8] rounded-full animate-spin" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">{t('swap.overlayPendingTitle')}</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.6)] mb-4">{t('swap.overlayPendingHint')}</p>
              {txHash && (
                <a
                  href={`${explorerBase}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)] text-[11px] font-[600] text-[#00ffc8] hover:bg-[rgba(0,255,200,0.15)] transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  <span>
                    {txHash.slice(0, 8)}...{txHash.slice(-6)}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-[#22c55e]" />
                </div>
              </div>
              <h3 className="text-[22px] font-[700] text-[#f1f5f9] mb-4">{t('swap.success')}</h3>
              {fromAmount && toAmount && (
                <div className="rounded-xl bg-[rgba(0,255,200,0.05)] border border-[rgba(0,255,200,0.1)] px-4 py-3 text-left space-y-2 mb-4">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">{t('swap.payLabel')}</span>
                    <span className="font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {fromAmount} {fromToken}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">{t('swap.receiveLabel')}</span>
                    <span className="font-[600] text-[#22c55e]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {toAmount} {toToken}
                    </span>
                  </div>
                </div>
              )}
              {txHash && (
                <a
                  href={`${explorerBase}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)] text-[11px] font-[600] text-[#00ffc8] hover:bg-[rgba(0,255,200,0.15)] transition mb-4"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  <span>{t('swap.viewTransaction')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full h-12 bg-gradient-to-r from-[#00ffc8] to-[#00d4aa] text-[#05050a] rounded-xl font-[700] text-[14px] hover:brightness-110 transition"
              >
                {t('swap.confirmButton')}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-full opacity-20" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-[#ef4444]" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">{t('swap.overlayErrorTitle')}</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.6)] mb-4">{error || t('swap.overlayErrorFallback')}</p>
              <button
                onClick={onClose}
                className="w-full h-12 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[#f1f5f9] rounded-xl font-[600] text-[14px] hover:bg-[rgba(255,255,255,0.12)] transition"
              >
                {t('swap.closeButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
