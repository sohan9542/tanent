import { redirect } from 'next/navigation'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { requireAdminAuth } from '@/lib/middleware-admin'
import CapmoPollClient from './capmo-poll-client'

export default async function CapmoPollPage() {
  // Check admin authentication
  const platformUser = await getCurrentPlatformUser()
  const staffUser = await getCurrentStaffUser()
  const legacyAdmin = await requireAdminAuth()

  if (!platformUser && !staffUser && !legacyAdmin) {
    redirect('/admin/login')
  }

  return <CapmoPollClient />
}
