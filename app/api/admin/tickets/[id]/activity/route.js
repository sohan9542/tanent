import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tickets/[id]/activity - Get activity logs for a ticket
 */
export async function GET(request, { params }) {
  try {
    const { id } = params

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const isPlatformAdmin = platformUser?.role === 'platform_admin'
    const staffUser = await getCurrentStaffUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !staffUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get ticket to verify access
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check access
    if (!isPlatformAdmin && staffUser) {
      const canAccess = await canAccessTicket(staffUser, ticket)
      if (!canAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Get activity logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('ticket_activity_logs')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('Error fetching activity logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      logs: logs || []
    })
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
