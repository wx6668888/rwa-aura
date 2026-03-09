import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/components/locale-provider'
import { Web3Provider } from '@/components/providers/web3-provider'
import { EthereumSuppressScript } from '@/components/providers/ethereum-suppress-script'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

// 生产环境 DApp 入口域名（用于欧易等 DApp 审核、分享链接、Open Graph）
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kelian.dpdns.org'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'RWA Protocol - Tokenize Real World Assets on BSC',
  description: 'Tokenize real world assets on BSC. 50/50 asset model. 0.8% daily static yield.',
  openGraph: {
    url: appUrl,
    siteName: 'RWA Protocol',
    title: 'RWA Protocol - Tokenize Real World Assets on BSC',
    description: 'Tokenize real world assets on BSC. 50/50 asset model. 0.8% daily static yield.',
    locale: 'zh_CN',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        {/* 首页 Hero 动图预加载，减少首屏动图加载等待 */}
        <link rel="preload" href="/动画/blockchain.lottie" as="fetch" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {/* 在最早阶段执行，抑制 MetaMask 扩展与 Next.js 热重载冲突的错误 */}
        <Script
          id="ethereum-error-suppress"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
                // 保存原始的 defineProperty
                const originalDefineProperty = Object.defineProperty;
                
                // 包装 defineProperty 以捕获 ethereum 重定义错误
                Object.defineProperty = function(obj, prop, descriptor) {
                  // 如果是尝试定义 window.ethereum，且已经存在且不可配置
                  if (prop === 'ethereum' && obj === window) {
                    try {
                      const existingDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
                      
                      // 如果属性已存在且不可配置，说明是 MetaMask 扩展注入的
                      if (existingDescriptor && !existingDescriptor.configurable) {
                        // 在开发环境中，静默忽略重定义尝试
                        return window;
                      }
                      
                      // 尝试正常定义
                      return originalDefineProperty.call(this, obj, prop, descriptor);
                    } catch (error) {
                      // 捕获重定义错误，静默处理
                      if (error && (error.message && error.message.includes('Cannot redefine property') || error.toString().includes('Cannot redefine property'))) {
                        // 在开发环境中，这是正常行为，静默处理
                        return window;
                      }
                      // 其他错误正常抛出
                      throw error;
                    }
                  }
                  
                  // 对于其他属性，正常处理
                  try {
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  } catch (error) {
                    // 捕获其他重定义错误
                    if (error && error.message && error.message.includes('Cannot redefine property')) {
                      // 在开发环境中静默处理
                      return obj;
                    }
                    throw error;
                  }
                };
                
                // 处理全局错误事件（作为备用方案）
                const handleError = function(event) {
                  if (event.message && (event.message.includes('Cannot redefine property: ethereum') || event.message.includes('Cannot redefine property'))) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                  }
                };
                
                const handleUnhandledRejection = function(event) {
                  const errorMessage = event.reason && (event.reason.message || event.reason.toString()) || '';
                  if (typeof errorMessage === 'string' && (errorMessage.includes('Cannot redefine property: ethereum') || errorMessage.includes('Cannot redefine property'))) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                };
                
                // 在最早阶段添加事件监听器（使用捕获阶段，优先级最高）
                window.addEventListener('error', handleError, true);
                window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
              })();
            `,
          }}
        />
        {/* 备用错误处理组件 */}
        <EthereumSuppressScript />
        <LocaleProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
