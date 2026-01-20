import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tickets/[id] - Get ticket details
 */
export async function GET(request, { params }) {
  try {
    const { id } = params

    // Get ticket with related data
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        tenant:tenants(id, tenant_id, first_name, last_name, email, phone, building_name, unit_number),
        object:objects(id, name, address),
        pre_ticket:pre_tickets(id, status)
      `)
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const isPlatformAdmin = platformUser?.role === 'platform_admin'
    const staffUser = await getCurrentStaffUser()
    const legacyAdmin = await requireAdminAuth()

    if (!platformUser && !staffUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Platform admin can access all tickets
    if (isPlatformAdmin) {
      // Allow access
    } else if (staffUser) {
      // Organization user - verify they can access this ticket
      const canAccess = await canAccessTicket(staffUser, ticket)
      if (!canAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }
    // Legacy admin also has access (backward compatibility)

    // Get pre-ticket messages if exists
    let messages = []
    if (ticket.pre_ticket_id) {
      const { data: preTicketMessages } = await supabaseAdmin
        .from('pre_ticket_messages')
        .select('*')
        .eq('pre_ticket_id', ticket.pre_ticket_id)
        .order('created_at', { ascending: true })

      messages = preTicketMessages || []
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        messages
      }
    })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
