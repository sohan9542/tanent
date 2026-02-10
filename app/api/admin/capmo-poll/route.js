import { NextResponse } from 'next/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { requireAdminAuth } from '@/lib/middleware-admin'
import { pollCapmoTickets } from '@/lib/integrations/capmo/poll'

export async function POST(request) {
  try {
    // Check admin authentication
    const platformUser = await getCurrentPlatformUser()
    const staffUser = await getCurrentStaffUser()
    const legacyAdmin = await requireAdminAuth()

    if (!platformUser && !staffUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the poll function directly
    const result = await pollCapmoTickets()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin capmo poll error:', error)
    return NextResponse.json(
      { error: 'An error occurred', details: error.message },
      { status: 500 }
    )
  }
}
