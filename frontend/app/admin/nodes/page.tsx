'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { NodesManagementPage } from '@/components/admin/nodes-management-page'

export default function NodesPage() {
  return (
    <AdminLayout>
      <NodesManagementPage />
    </AdminLayout>
  )
}
