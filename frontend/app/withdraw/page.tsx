import { Navbar } from '@/components/navbar'
import { WithdrawPageV3 } from '@/components/withdraw/withdraw-page-v3'

export const metadata = {
  title: '提现 | RWA Protocol',
  description: '资产提取中心',
}

export default function WithdrawPage() {
  return (
    <>
      <Navbar />
      <WithdrawPageV3 />
    </>
  )
}
