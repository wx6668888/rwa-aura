'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
import { TransactionsPage } from '@/components/admin/transactions-page'

export default function TransactionsPageRoute() {
  return (
    <AdminLayout>
      <TransactionsPage />
    </AdminLayout>
  )
}
