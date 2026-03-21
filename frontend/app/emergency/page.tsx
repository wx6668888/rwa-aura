import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { EmergencyPageClient } from '@/components/emergency/emergency-page-client'

export const metadata: Metadata = {
  title: '紧急提取 | RWA Protocol',
  description: '紧急提取您的质押资产，请仔细阅读所有条款后操作。',
}

export default function EmergencyPage() {
  return (
    <>
      <EmergencyNavbar />
      <EmergencyPageClient />
    </>
  )
}

// Wrapper that injects the EMERGENCY badge into the active nav item
function EmergencyNavbar() {
  return <NavbarWithEmergencyBadge />
}

function NavbarWithEmergencyBadge() {
  // We re-use the shared Navbar; the badge is shown via the page-level
  // danger stripe. The Navbar itself already highlights the active route.
  return <Navbar />
}
