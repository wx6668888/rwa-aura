'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { AndroidWalletConnectHint } from '@/components/android-wallet-connect-hint'
import { WalletResumeSync } from '@/components/providers/wallet-resume-sync'

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
          theme={darkTheme({
            accentColor: '#00f5d4',
            accentColorForeground: '#0a0a12',
            borderRadius: 'medium',
          })}
          modalSize="compact"
          locale={getRainbowKitLocale(locale)}
          appInfo={{
            appName: 'RWA Protocol',
            learnMoreUrl: locale === 'zh' ? 'https://ethereum.org/zh/wallets/' : 'https://ethereum.org/wallets/',
          }}
        >
          <WalletResumeSync />
          <AndroidWalletConnectHint />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
