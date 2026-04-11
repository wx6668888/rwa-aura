import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/components/locale-provider'
import { Web3Provider } from '@/components/providers/web3-provider'
import { EthereumSuppressScript } from '@/components/providers/ethereum-suppress-script'
import { CapacitorNativeRuntime } from '@/components/providers/capacitor-native-runtime'
import { ConditionalNavbar } from '@/components/conditional-navbar'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  weight: ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

// 生产环境 DApp 入口域名（用于欧易等 DApp 审核、分享链接、Open Graph）
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rwaprotocol.dpdns.org'

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
    images: [{ url: '/app-icon-256.webp', width: 256, height: 256, alt: 'RWA Protocol' }],
  },
  twitter: {
    card: 'summary',
    title: 'RWA Protocol - Tokenize Real World Assets on BSC',
    description: 'Tokenize real world assets on BSC. 50/50 asset model. 0.8% daily static yield.',
    images: ['/app-icon-256.webp'],
  },
  icons: {
    icon: [
      { url: '/app-icon-256.webp', type: 'image/webp', sizes: '256x256' },
      { url: '/app-icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/app-icon-256.webp', sizes: '256x256', type: 'image/webp' }],
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#05050a',
  // 减少移动端聚焦输入框时布局与视口剧烈跳动（尤其 Android Chrome）
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RWA Protocol" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased overflow-x-hidden`}
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
        <CapacitorNativeRuntime />
        <LocaleProvider>
          <Web3Provider>
            {children}
            <ConditionalNavbar />
          </Web3Provider>
        </LocaleProvider>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  )
}
