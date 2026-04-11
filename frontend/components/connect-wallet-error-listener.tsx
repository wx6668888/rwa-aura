'use client'

import { useEffect, useRef } from 'react'
import { useConnect } from 'wagmi'
import { toast } from 'sonner'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

/** 连接失败时提示（含 WalletConnect 在国内无响应等情况） */
export function ConnectWalletErrorListener() {
  const { error, reset, status, variables } = useConnect()
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const seen = useRef<string | null>(null)
  const pendingHintShown = useRef(false)

  useEffect(() => {
    if (!error) {
      seen.current = null
      return
    }
    const key = `${error.name}:${error.message}`
    if (seen.current === key) return
    seen.current = key
    toast.error(t('nav.walletConnectFailedTitle'), {
      description: t('nav.walletConnectFailedDesc'),
      duration: 12_000,
    })
    reset()
  }, [error, reset, t])

  useEffect(() => {
    if (status !== 'pending') {
      pendingHintShown.current = false
      return
    }

    const connectorId = String((variables as any)?.connector?.id || '').toLowerCase()
    const isWalletConnect = connectorId.includes('walletconnect') || connectorId.includes('wallet_connect')
    if (!isWalletConnect || pendingHintShown.current) return

    const timer = window.setTimeout(() => {
      if (pendingHintShown.current) return
      pendingHintShown.current = true
      toast.warning(
        locale.startsWith('zh') ? 'WalletConnect 连接超时' : 'WalletConnect timeout',
        {
          description: locale.startsWith('zh')
            ? '当前网络可能无法访问 WalletConnect 中继。建议优先使用币安钱包/TokenPocket，或开启可访问外网后重试。'
            : 'Current network may not reach the WalletConnect relay. Try Binance Wallet/TokenPocket first, or use a network that can access the relay.',
          duration: 12_000,
        }
      )
    }, 10_000)

    return () => window.clearTimeout(timer)
  }, [status, variables, locale])

  return null
}
