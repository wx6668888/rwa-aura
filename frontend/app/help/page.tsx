import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { HelpPageClient } from '@/components/help/help-page-client'

export const metadata = {
  title: '帮助中心 | RWA Protocol',
  description: 'RWA Protocol 帮助中心 - 常见问题解答和文档',
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />
      <HelpPageClient />
    </div>
  )
}
