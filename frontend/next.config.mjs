import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 明确指定 Turbopack 的根目录为当前 frontend 目录，避免工作区推断错误
  // 这可以解决检测到多个 lockfiles 时的警告和错误
  turbopack: {
    root: __dirname,
  },
  // 忽略钱包扩展的 ethereum 重定义错误（这是正常行为）
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // API 代理：将前端请求转发到后端（同源 /api/* 避免浏览器请求 localhost 失败）
  async rewrites() {
    return [
      // 聊天服务独立端口 3002：必须先于通用 /api 匹配
      {
        source: '/api/chat/:path*',
        destination: 'http://127.0.0.1:3002/api/chat/:path*',
      },
      {
        source: '/chat-ws/:path*',
        destination: 'http://127.0.0.1:3002/chat-ws/:path*',
      },
      {
        source: '/api/relayer/:path*',
        destination: 'http://localhost:3001/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ]
  },
  // 推广图 / Lottie 海报：长缓存（更新资源时请换文件名或 ?v= 并清 CDN）
  async headers() {
    return [
      {
        source: '/images/promo-phones/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/lottie-posters/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
