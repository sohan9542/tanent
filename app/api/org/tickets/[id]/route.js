import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { createProjectTicket, normalizeCapmoStatus } from '@/lib/integrations/capmo/client'
import { buildCapmoTicketPayload } from '@/lib/integrations/capmo/mapping'
import { sendEmail } from '@/lib/email/resend'

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
      .select(
        'id, object_id, tenant_id, current_org_role, status, resolved_at, category, location_details, urgency, description, images, ai_followups, ai_answers'
      )
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

    const { data: objectDetails, error: objectError } = await supabaseAdmin
      .from('objects')
      .select('id, name, address, street, zip, city, capmo_project_id, capmo_project_name, handoff_delivery')
      .eq('id', ticket.object_id)
      .single()

    const handoffDelivery = (objectError ? null : objectDetails?.handoff_delivery) === 'capmo' ? 'capmo' : 'email'

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
    let nextRole = null

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
      nextRole = ROLE_SEQUENCE[ROLE_SEQUENCE.indexOf(currentRole) + 1]
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

    // Pass to technical: create Capmo ticket when object handoff is "Send via Capmo"
    const shouldCreateCapmo =
      action === 'set_technical' &&
      handoffDelivery === 'capmo' &&
      objectDetails?.capmo_project_id &&
      !updatedTicket.capmo_ticket_id

    if (shouldCreateCapmo) {
      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('id, tenant_id, first_name, last_name, email, phone, building_name, unit_number')
          .eq('id', updatedTicket.tenant_id)
          .single()

        const payload = buildCapmoTicketPayload({
          ticket: updatedTicket,
          object: objectDetails,
          tenant
        })

        const capmoResponse = await createProjectTicket(
          objectDetails.capmo_project_id,
          payload
        )

        const capmoTicketId = capmoResponse?.data?.id || null
        const capmoStatusRaw = capmoResponse?.data?.status || null
        const capmoStatus = normalizeCapmoStatus(capmoStatusRaw) || capmoStatusRaw || 'created'

        const isClosed = capmoStatus === 'CLOSED' || capmoStatus === 'Closed'
        const nextPollAt = isClosed
          ? null
          : new Date(Date.now() + 2 * 60 * 1000).toISOString()

        const updatePayload = {
          capmo_ticket_id: capmoTicketId,
          capmo_status: capmoStatus,
          capmo_last_synced_at: new Date().toISOString(),
          capmo_next_poll_at: nextPollAt,
          capmo_payload: payload,
          capmo_error: null
        }
        if (!capmoTicketId) {
          updatePayload.capmo_error = 'Capmo ticket created but response missing ticket id'
        }

        await supabaseAdmin
          .from('tickets')
          .update(updatePayload)
          .eq('id', updatedTicket.id)
      } catch (capmoError) {
        console.error('Capmo ticket creation error:', capmoError)
        await supabaseAdmin
          .from('tickets')
          .update({
            capmo_error: capmoError?.message || 'Capmo ticket creation failed'
          })
          .eq('id', updatedTicket.id)
      }
    }

    // Pass to warranty: send email to the warranty organization's members when object handoff is "Send via Email"
    const shouldEmailWarranty =
      action === 'advance' &&
      nextRole === 'warranty' &&
      handoffDelivery === 'email'

    let warrantyEmailSent = null
    let warrantyEmailReason = null

    if (shouldEmailWarranty && assignment.warranty_org_id) {
      try {
        // Get all members of the warranty organization (they are the warranty managers for this object)
        const { data: warrantyMemberships, error: membersError } = await supabaseAdmin
          .from('organization_memberships')
          .select('user:platform_users(email, name)')
          .eq('organization_id', assignment.warranty_org_id)

        if (membersError) {
          console.warn('Warranty email: could not load warranty org members:', membersError.message)
          warrantyEmailSent = false
          warrantyEmailReason = 'Could not load warranty organization members.'
        } else {
          const warrantyEmails = (warrantyMemberships || [])
            .map((m) => (m.user && typeof m.user.email === 'string' ? m.user.email.trim() : null))
            .filter(Boolean)
          const uniqueEmails = [...new Set(warrantyEmails)]

          if (uniqueEmails.length === 0) {
            warrantyEmailSent = false
            warrantyEmailReason = 'Warranty organization has no members with an email address.'
          } else {
            const { data: tenant } = await supabaseAdmin
              .from('tenants')
              .select('first_name, last_name, email, phone, unit_number')
              .eq('id', updatedTicket.tenant_id)
              .single()

            const subject = `Ticket passed to Warranty: ${updatedTicket.id}`
            const html = `
            <h2>Ticket passed to Warranty</h2>
            <p><strong>Ticket ID:</strong> ${updatedTicket.id}</p>
            <p><strong>Category:</strong> ${updatedTicket.category || 'N/A'}</p>
            <p><strong>Location:</strong> ${updatedTicket.location_details || 'N/A'}</p>
            <p><strong>Urgency:</strong> ${updatedTicket.urgency || 'N/A'}</p>
            <p><strong>Warranty flag:</strong> ${updatedTicket.warranty_flag ? 'Yes' : 'No'}</p>
            ${objectDetails?.name ? `<p><strong>Object:</strong> ${objectDetails.name}</p>` : ''}
            ${tenant ? `<p><strong>Tenant:</strong> ${tenant.first_name} ${tenant.last_name}${tenant.email ? ` (${tenant.email})` : ''}</p>` : ''}
            <p><strong>Description:</strong></p>
            <p>${(updatedTicket.description || 'N/A').replace(/</g, '&lt;')}</p>
            <p><strong>Created:</strong> ${new Date(updatedTicket.created_at).toLocaleString()}</p>
          `

            const emailResult = await sendEmail({
              to: uniqueEmails,
              subject,
              html,
              text: html.replace(/<[^>]*>/g, ''),
              eventKey: `${updatedTicket.id}:warranty-handoff:${Date.now()}`,
              eventType: 'ticket_handoff_warranty',
              ticketId: updatedTicket.id
            })

            if (emailResult?.skipped) {
              warrantyEmailSent = false
              warrantyEmailReason = emailResult.reason || 'Email was skipped'
              console.warn('Warranty email skipped:', emailResult.reason)
            } else {
              warrantyEmailSent = true
              warrantyEmailReason = `Email sent to warranty organization (${uniqueEmails.length} recipient${uniqueEmails.length === 1 ? '' : 's'})`
            }
          }
        }
      } catch (emailErr) {
        console.error('Warranty handoff email error:', emailErr)
        warrantyEmailSent = false
        warrantyEmailReason = emailErr?.message || 'Failed to send email'
      }
    }

    const responsePayload = { ticket: updatedTicket }
    if (warrantyEmailSent !== null) {
      responsePayload.warrantyEmailSent = warrantyEmailSent
      if (warrantyEmailReason) responsePayload.warrantyEmailReason = warrantyEmailReason
    }
    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Update ticket workflow error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
