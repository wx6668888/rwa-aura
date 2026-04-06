'use client'

import { useEffect, useRef } from 'react'
import { useConnect } from 'wagmi'
import { toast } from 'sonner'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

/** 连接失败时提示（含 WalletConnect 在国内无响应等情况） */
export function ConnectWalletErrorListener() {
  const { error, reset } = useConnect()
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const seen = useRef<string | null>(null)

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

  return null
}
