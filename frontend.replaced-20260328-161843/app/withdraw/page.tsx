import { Suspense } from 'react'
import { Navbar } from '@/components/navbar'
import { WithdrawPageV3 } from '@/components/withdraw/withdraw-page-v3'
import { StakesProvider } from '@/contexts/StakesContext'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '提现 | RWA Protocol',
  description: '资产提取中心',
}

export default function WithdrawPage() {
  return (
    <>
      <Navbar />
      <StakesProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" aria-hidden />}>
          <WithdrawPageV3 />
        </Suspense>
      </StakesProvider>
    </>
  )
}
