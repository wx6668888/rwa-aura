'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { UserManagementPage } from '@/components/admin/user-management-page'

export default function UsersPage() {
  return (
    <AdminLayout>
      <UserManagementPage />
    </AdminLayout>
  )
}
