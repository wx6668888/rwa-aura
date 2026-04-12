'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import type { Theme } from '@rainbow-me/rainbowkit'

/** 与 WalletDetailsModal（钱包总览）一致的连接弹窗配色 */
function buildRwaRainbowKitTheme(): Theme {
  const base = darkTheme({
    accentColor: '#00f5d4',
    accentColorForeground: '#05050a',
    borderRadius: 'large',
    overlayBlur: 'small',
  })
  return {
    ...base,
    colors: {
      ...base.colors,
      modalBackdrop: 'rgba(5, 5, 10, 0.6)',
      modalBackground:
        'linear-gradient(180deg, rgb(13 13 20) 0%, rgb(10 10 16) 52%, rgb(13 13 20) 100%)',
      modalBorder: 'rgba(0, 245, 212, 0.125)',
      generalBorder: 'rgba(0, 245, 212, 0.14)',
      generalBorderDim: 'rgba(0, 245, 212, 0.07)',
      modalText: '#f1f5f9',
      modalTextSecondary: '#94a3b8',
      modalTextDim: 'rgba(148, 163, 184, 0.45)',
      profileForeground: 'rgb(13 13 20)',
      profileAction: 'rgba(0, 245, 212, 0.08)',
      profileActionHover: 'rgba(0, 245, 212, 0.15)',
      closeButton: '#94a3b8',
      closeButtonBackground: 'rgba(255, 255, 255, 0.06)',
      menuItemBackground: 'rgba(0, 245, 212, 0.06)',
      selectedOptionBorder: 'rgba(0, 245, 212, 0.22)',
      actionButtonBorder: 'rgba(0, 245, 212, 0.12)',
      actionButtonBorderMobile: 'rgba(0, 245, 212, 0.16)',
      actionButtonSecondaryBackground: 'rgba(18, 18, 26, 0.88)',
      connectButtonBackground: 'rgb(13 13 20)',
      connectButtonInnerBackground:
        'linear-gradient(0deg, rgba(0,245,212,0.05), rgba(255,255,255,0.07))',
      downloadBottomCardBackground:
        'linear-gradient(126deg, rgba(0, 0, 0, 0) 9.49%, rgba(0, 245, 212, 0.12) 71.04%), rgb(13 13 20)',
      downloadTopCardBackground:
        'linear-gradient(126deg, rgba(0, 245, 212, 0.1) 9.49%, rgba(0, 0, 0, 0) 71.04%), rgb(13 13 20)',
    },
    shadows: {
      ...base.shadows,
      dialog:
        '0 -12px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,245,212,0.06) inset, 0 8px 32px rgba(0,0,0,0.35)',
    },
  }
}

const rwaRainbowKitTheme = buildRwaRainbowKitTheme()
import { config } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { AndroidWalletConnectHint } from '@/components/android-wallet-connect-hint'
import { WalletResumeSync } from '@/components/providers/wallet-resume-sync'
import { ChatAuthSync } from '@/components/providers/chat-auth-sync'
import { Toaster } from 'sonner'
import { ConnectWalletErrorListener } from '@/components/connect-wallet-error-listener'
import { WalletConnectDisclaimer, rwaConnectGuideHref } from '@/components/wallet-connect-disclaimer'
import { RwaConnectWalletMenuProvider } from '@/components/providers/rwa-connect-wallet-context'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 从钱包返回浏览器后，尽量拉新链上/接口数据（质押、余额等）
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// RainbowKit 弹窗多语言：使用标准 locale，弹窗标题/「什么是钱包」等会随语言切换
const getRainbowKitLocale = (locale: string): string => {
  const localeMap: Record<string, string> = {
    'zh': 'zh-CN',
    'en': 'en',
    'ko': 'ko-KR',
    'es': 'es',
    'ar': 'ar',
    'hi': 'hi',
    'fr': 'fr',
    'pt': 'pt-BR',
    'ru': 'ru',
    'ja': 'ja',
  }
  return localeMap[locale] || 'en'
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()

  useEffect(() => {
    // 在客户端挂载后设置错误处理器，捕获 ethereum 属性重定义错误
    if (typeof window === 'undefined') return

    const handleError = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes('Cannot redefine property: ethereum') ||
         event.message.includes('Cannot redefine property'))
      ) {
        // 静默处理，这是正常行为
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || ''
      if (
        typeof errorMessage === 'string' &&
        (errorMessage.includes('Cannot redefine property: ethereum') ||
         errorMessage.includes('Cannot redefine property'))
      ) {
        // 静默处理，这是正常行为
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          id="rwa_rk"
          theme={rwaRainbowKitTheme}
          modalSize="compact"
          locale={getRainbowKitLocale(locale)}
          appInfo={{
            appName: 'RWA Protocol',
            learnMoreUrl: rwaConnectGuideHref(),
            disclaimer: WalletConnectDisclaimer,
          }}
        >
          <RwaConnectWalletMenuProvider>
            <ConnectWalletErrorListener />
            <WalletResumeSync />
            <ChatAuthSync />
            <AndroidWalletConnectHint />
            <Toaster position="top-center" richColors closeButton theme="dark" />
            {children}
          </RwaConnectWalletMenuProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
