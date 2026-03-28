import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { StakePageClient } from '@/components/stake/stake-page-client'

/** 避免 CDN/边缘长期缓存旧版质押页 HTML，导致仍看到内置 Tab 的旧布局 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '质押 | RWA Protocol',
  description: '存入USDT，每日获得0.8%的RWA代币静态收益',
}

export default function StakePage() {
  return (
    <div className="min-h-screen bg-[#0b0e11] font-sans">
      <BackgroundEffects />
      <Navbar />
      <StakePageClient />
    </div>
  )
}
