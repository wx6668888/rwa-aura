import { Navbar } from '@/components/navbar'
import { WithdrawPageClient } from '@/components/withdraw/withdraw-page-client'

export const metadata = {
  title: '提现 | RWA Protocol',
  description: '提取RWA代币及USDT动态奖励',
}

export default function WithdrawPage() {
  return (
    <div className="min-h-screen" style={{ background: '#05050a' }}>
      {/* Reduced-opacity background orbs for transactional page */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-40 end-[-200px] h-[600px] w-[600px] rounded-full blur-[180px]"
          style={{ background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)', opacity: 0.07 }}
        />
        <div
          className="absolute -bottom-60 start-[-300px] h-[800px] w-[800px] rounded-full blur-[220px]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', opacity: 0.06 }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" aria-hidden="true">
          <filter id="grain-w">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-w)" />
        </svg>
      </div>

      <Navbar />
      <WithdrawPageClient />
    </div>
  )
}
