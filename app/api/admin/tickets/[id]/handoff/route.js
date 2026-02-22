import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { logTicketActivity, getCurrentAdminForLogging } from '@/lib/admin-activity-log'
import { createProjectTicket } from '@/lib/integrations/capmo/client'
import { buildCapmoTicketPayload } from '@/lib/integrations/capmo/mapping'
import { sendEmail } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/tickets/[id]/handoff - Trigger ticket handoff (email or Capmo)
 */
export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { handoff_type } = body // 'email' or 'capmo'

    if (!handoff_type || !['email', 'capmo'].includes(handoff_type)) {
      return NextResponse.json(
        { error: 'Invalid handoff_type. Must be "email" or "capmo"' },
        { status: 400 }
      )
    }

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

    // Get ticket with related data
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        tenant:tenants(id, tenant_id, first_name, last_name, email, phone, building_name, unit_number),
        object:objects(id, name, address, street, zip, city, capmo_project_id)
      `)
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

    const adminInfo = await getCurrentAdminForLogging()

    // Handle Capmo handoff
    if (handoff_type === 'capmo') {
      // Check if Capmo is enabled
      const { data: capmoSetting } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'capmo_enabled')
        .single()

      const capmoEnabled = capmoSetting?.setting_value?.enabled === true

      if (!capmoEnabled) {
        return NextResponse.json(
          { error: 'Capmo handoff is disabled. Please enable it in integration settings.' },
          { status: 400 }
        )
      }

      // Check if ticket already has Capmo ticket
      if (ticket.capmo_ticket_id) {
        return NextResponse.json(
          { error: 'Ticket already has a Capmo ticket. Use Capmo to update it.' },
          { status: 400 }
        )
      }

      // Check if object has Capmo project ID
      if (!ticket.object?.capmo_project_id) {
        return NextResponse.json(
          { error: 'Object does not have a Capmo project ID configured.' },
          { status: 400 }
        )
      }

      try {
        // Build payload
        const payload = buildCapmoTicketPayload({
          ticket,
          object: ticket.object,
          tenant: ticket.tenant
        })

        // Create ticket in Capmo
        const capmoResponse = await createProjectTicket(
          ticket.object.capmo_project_id,
          payload
        )

        const capmoTicketId = capmoResponse?.data?.id || null
        const capmoStatusRaw = capmoResponse?.data?.status || null

        // Update ticket
        await supabaseAdmin
          .from('tickets')
          .update({
            capmo_ticket_id: capmoTicketId,
            capmo_status: capmoStatusRaw,
            capmo_last_synced_at: new Date().toISOString(),
            capmo_payload: payload,
            capmo_error: null
          })
          .eq('id', id)

        // Log activity
        await logTicketActivity({
          ticketId: id,
          actionType: 'handoff_triggered',
          actionDetails: {
            handoff_type: 'capmo',
            capmo_ticket_id: capmoTicketId,
            capmo_status: capmoStatusRaw
          },
          adminUser: adminInfo
        })

        return NextResponse.json({
          success: true,
          message: 'Ticket handed off to Capmo successfully',
          capmo_ticket_id: capmoTicketId
        })
      } catch (capmoError) {
        console.error('Capmo handoff error:', capmoError)
        
        // Update ticket with error
        await supabaseAdmin
          .from('tickets')
          .update({
            capmo_error: capmoError?.message || 'Capmo handoff failed'
          })
          .eq('id', id)

        return NextResponse.json(
          { error: `Capmo handoff failed: ${capmoError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    // Handle Email handoff
    if (handoff_type === 'email') {
      // Get email recipients from settings
      const { data: emailSetting } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'email_handoff_recipients')
        .single()

      const recipients = emailSetting?.setting_value || {}
      const contractorEmail = recipients.contractor || ''
      const warrantyEmail = recipients.warranty_manager || ''

      if (!contractorEmail && !warrantyEmail) {
        return NextResponse.json(
          { error: 'No email recipients configured. Please configure email recipients in integration settings.' },
          { status: 400 }
        )
      }

      const emailRecipients = [contractorEmail, warrantyEmail].filter(Boolean)

      // Build email content
      const subject = `Ticket Handoff: ${ticket.title || ticket.id}`
      const html = `
        <h2>Ticket Handoff</h2>
        <p><strong>Ticket ID:</strong> ${ticket.id}</p>
        <p><strong>Title:</strong> ${ticket.title || 'N/A'}</p>
        <p><strong>Category:</strong> ${ticket.category || 'N/A'}</p>
        <p><strong>Status:</strong> ${ticket.status}</p>
        <p><strong>Warranty Flag:</strong> ${ticket.warranty_flag ? 'Yes' : 'No'}</p>
        ${ticket.location_details ? `<p><strong>Location:</strong> ${ticket.location_details}</p>` : ''}
        ${ticket.object?.name ? `<p><strong>Object:</strong> ${ticket.object.name}</p>` : ''}
        ${ticket.description ? `<p><strong>Description:</strong><br>${ticket.description}</p>` : ''}
        ${ticket.tenant ? `<p><strong>Tenant:</strong> ${ticket.tenant.first_name} ${ticket.tenant.last_name}${ticket.tenant.email ? ` (${ticket.tenant.email})` : ''}</p>` : ''}
        <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
        <p><strong>Last Updated:</strong> ${new Date(ticket.updated_at).toLocaleString()}</p>
      `

      try {
        await sendEmail({
          to: emailRecipients,
          subject,
          html,
          text: html.replace(/<[^>]*>/g, ''),
          eventKey: `${ticket.id}:handoff:email:${Date.now()}`,
          eventType: 'ticket_handoff',
          ticketId: ticket.id
        })

        // Log activity
        await logTicketActivity({
          ticketId: id,
          actionType: 'handoff_triggered',
          actionDetails: {
            handoff_type: 'email',
            recipients: emailRecipients
          },
          adminUser: adminInfo
        })

        return NextResponse.json({
          success: true,
          message: 'Ticket handed off via email successfully',
          recipients: emailRecipients
        })
      } catch (emailError) {
        console.error('Email handoff error:', emailError)
        return NextResponse.json(
          { error: `Email handoff failed: ${emailError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Handoff error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
