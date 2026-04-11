import { BackgroundEffects } from '@/components/background-effects'
import { ParticleField } from '@/components/nodes/particle-field'
import { MyNetworkPageClient } from '@/components/node/network/my-network-page-client'

export const metadata = {
  title: '我的网络 | RWA Protocol',
  description: '节点等级、团队数据、分红与直推奖励、关系树与留存排行，数据可对照链上与索引服务。',
}

export default function NodeNetworkPage() {
  return (
    <div className="relative min-h-screen bg-[#05050a]">
      <BackgroundEffects />
      <ParticleField />
      <MyNetworkPageClient />
    </div>
  )
}
