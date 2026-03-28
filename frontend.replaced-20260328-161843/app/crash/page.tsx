import { Navbar } from '@/components/navbar'
import { CrashGameClient } from '@/components/games/crash/crash-game-client'

export const metadata = {
  title: '崩盘游戏 | RWA Protocol',
  description: '实时多人崩盘游戏',
}

export default function CrashPage() {
  return (
    <div className="min-h-screen bg-[#05050a]">
      <Navbar />
      <CrashGameClient />
    </div>
  )
}
