'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { OnChainDataPage } from '@/components/admin/onchain-data-page'

export default function OnChainPage() {
  return (
    <AdminLayout>
      <OnChainDataPage />
    </AdminLayout>
  )
}
