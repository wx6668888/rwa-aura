import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // 允许 unsafe-eval 用于开发环境（某些库需要）
  // 注意：Next.js 16 中 headers 配置可能需要不同的方式
  // 如果仍有问题，可以暂时注释掉这部分
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; object-src 'none';",
  //         },
  //       ],
  //     },
  //   ]
  // },
}

export default nextConfig
