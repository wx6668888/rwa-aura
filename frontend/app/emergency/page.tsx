import type { Metadata } from 'next'
import { EmergencyPageClient } from '@/components/emergency/emergency-page-client'

export const metadata: Metadata = {
  title: '紧急提取 | RWA Protocol',
  description: '紧急提取您的质押资产，请仔细阅读所有条款后操作。',
}

export default function EmergencyPage() {
  return <EmergencyPageClient />
}
