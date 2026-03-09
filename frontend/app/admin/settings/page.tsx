'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { SettingsPage } from '@/components/admin/settings-page'

export default function SettingsPageRoute() {
  return (
    <AdminLayout>
      <SettingsPage />
    </AdminLayout>
  )
}
