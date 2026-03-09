'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { DatabasePage } from '@/components/admin/database-page'

export default function DatabasePageRoute() {
  return (
    <AdminLayout>
      <DatabasePage />
    </AdminLayout>
  )
}
