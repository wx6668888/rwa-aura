import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { KnowledgePageClient } from '@/components/knowledge/knowledge-page-client'

export const metadata = {
  title: '知识库 | RWA Protocol',
  description: '从零开始了解 RWA 协议，常见问题与操作指南',
}

export default function KnowledgePage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />
      <KnowledgePageClient />
    </div>
  )
}
