import type { ReactNode } from 'react'

/** 避免整页 RSC shell 被 Full Route Cache 命中过久，部署后更快看到新 chunk 引用 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Swap | RWA Protocol',
  description: 'Swap USDT, RWA, and WBNB via protocol pool or PancakeSwap V3.',
}

export default function SwapLayout({ children }: { children: ReactNode }) {
  return children
}
