import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'

const ROLE_SEQUENCE = ['technical', 'warranty', 'owner']

function normalizeRole(role) {
  return role ? role.toLowerCase() : ''
}

export async function PATCH(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const action = body?.action

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id, object_id, current_org_role, status, resolved_at')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const canAccess = await canAccessTicket(staffUser, ticket)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('object_assignments')
      .select('owner_org_id, tech_org_id, warranty_org_id')
      .eq('object_id', ticket.object_id)
      .single()

    if (assignError || !assignment) {
      return NextResponse.json(
        { error: 'Object assignment not found' },
        { status: 400 }
      )
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', staffUser.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'Organization membership not found' },
        { status: 403 }
      )
    }

    const orgIds = memberships.map((membership) => membership.organization_id)
    const userRoles = new Set()

    if (orgIds.includes(assignment.tech_org_id)) {
      userRoles.add('technical')
    }
    if (orgIds.includes(assignment.warranty_org_id)) {
      userRoles.add('warranty')
    }
    if (orgIds.includes(assignment.owner_org_id)) {
      userRoles.add('owner')
    }

    const currentRole = normalizeRole(ticket.current_org_role)
    let updates = null

    if (action === 'set_technical') {
      if (!userRoles.has('technical')) {
        return NextResponse.json(
          { error: 'Only technical organization can assign this stage' },
          { status: 403 }
        )
      }
      updates = { current_org_role: 'technical' }
    } else if (action === 'advance') {
      if (!currentRole || !userRoles.has(currentRole)) {
        return NextResponse.json(
          { error: 'Only the current organization can advance' },
          { status: 403 }
        )
      }
      const nextRole = ROLE_SEQUENCE[ROLE_SEQUENCE.indexOf(currentRole) + 1]
      if (!nextRole) {
        return NextResponse.json(
          { error: 'Ticket is already at the final stage' },
          { status: 400 }
        )
      }
      updates = { current_org_role: nextRole }
    } else if (action === 'approve') {
      if (currentRole !== 'owner' || !userRoles.has('owner')) {
        return NextResponse.json(
          { error: 'Only owner organization can approve' },
          { status: 403 }
        )
      }
      updates = {
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update(updates)
      .eq('id', ticket.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('Update ticket workflow error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
