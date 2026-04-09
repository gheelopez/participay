export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const result = await getCurrentUser()

  if (!result.success || !result.data) {
    redirect('/login')
  }

  const profile = result.data.profile

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <AdminDashboard
      adminEmail={profile.email}
      adminId={profile.id}
    />
  )
}
