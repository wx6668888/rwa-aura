'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { X } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { shouldSuggestWalletConnectDeepLink } from '@/lib/wallet-environment'

const STORAGE_KEY = 'rwa_android_wc_hint_dismissed_v1'

export function AndroidWalletConnectHint() {
  const { address } = useAccount()
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  const connected = Boolean(address)
  const show = !connected && !dismissed && shouldSuggestWalletConnectDeepLink()

  if (!show) return null

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div
      role="status"
      // 不要盖住授权弹窗里的钱包图标：只允许关闭按钮可点击，其余区域不拦截点击事件。
      className="fixed left-0 right-0 top-16 z-[95] pointer-events-none border-b border-[#00f5d4]/25 bg-[#0a0a12]/95 px-4 py-2.5 text-center text-sm text-[#e2e8f0] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl items-start justify-center gap-3">
        <p className="flex-1 text-left leading-snug">{t('nav.androidWalletConnectHint')}</p>
        <button
          type="button"
          onClick={dismiss}
          className="pointer-events-auto shrink-0 rounded-full p-1 text-[#94a3b8] transition-colors hover:bg-[#ffffff0d] hover:text-[#00f5d4]"
          aria-label={t('nav.androidWalletConnectDismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
