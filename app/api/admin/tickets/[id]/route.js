import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { logTicketActivity, getCurrentAdminForLogging } from '@/lib/admin-activity-log'

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

/**
 * PATCH /api/admin/tickets/[id] - Update ticket status and warranty flag
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, warranty_flag } = body

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

    // Get current ticket
    const { data: currentTicket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check access (platform admin can access all, others need permission check)
    if (!isPlatformAdmin && staffUser) {
      const canAccess = await canAccessTicket(staffUser, currentTicket)
      if (!canAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Validate status if provided
    const validStatuses = ['Open', 'In Review', 'Closed', 'NEW', 'open', 'in_progress', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update payload
    const updatePayload = {}
    if (status !== undefined) {
      updatePayload.status = status
    }
    if (warranty_flag !== undefined) {
      updatePayload.warranty_flag = Boolean(warranty_flag)
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    // Log activities
    const adminInfo = await getCurrentAdminForLogging()
    
    if (status !== undefined && status !== currentTicket.status) {
      await logTicketActivity({
        ticketId: id,
        actionType: 'status_change',
        actionDetails: {
          old_status: currentTicket.status,
          new_status: status
        },
        adminUser: adminInfo
      })
    }

    if (warranty_flag !== undefined && warranty_flag !== currentTicket.warranty_flag) {
      await logTicketActivity({
        ticketId: id,
        actionType: 'warranty_flag_toggle',
        actionDetails: {
          old_value: currentTicket.warranty_flag || false,
          new_value: warranty_flag
        },
        adminUser: adminInfo
      })
    }

    return NextResponse.json({
      ticket: updatedTicket,
      message: 'Ticket updated successfully'
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
