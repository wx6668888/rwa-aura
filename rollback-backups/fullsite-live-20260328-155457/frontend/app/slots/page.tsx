import { Navbar } from '@/components/navbar'
import { SlotMachineClient } from '@/components/games/slots/slot-machine-client'

export const metadata = {
  title: '老虎机 | RWA Protocol',
  description: '经典老虎机游戏',
}

export default function SlotsPage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-['Space_Grotesk']">
      <Navbar />
      <SlotMachineClient />
    </div>
  )
}
