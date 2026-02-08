import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createProjectTicket, normalizeCapmoStatus } from '@/lib/integrations/capmo/client'
import { buildCapmoTicketPayload } from '@/lib/integrations/capmo/mapping'
import { sendTicketCreatedEmails } from '@/lib/email/notifications'
import { validateImageFile, uploadImage, MAX_FILES } from '@/lib/storage'

/**
 * GET /api/pre-tickets/[id] - Get a specific pre-ticket
 */
export async function GET(request, { params }) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle async params (Next.js 15+)
    const resolvedParams = await params
    const { id } = resolvedParams

    const { data: preTicket, error } = await supabaseAdmin
      .from('pre_tickets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (error || !preTicket) {
      return NextResponse.json(
        { error: 'Pre-ticket not found' },
        { status: 404 }
      )
    }

    // Get messages for this pre-ticket
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('pre_ticket_messages')
      .select('*')
      .eq('pre_ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    return NextResponse.json({
      preTicket: preTicket,
      messages: messages || []
    })
  } catch (error) {
    console.error('Get pre-ticket error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pre-tickets/[id] - Update a pre-ticket (add messages, update status)
 */
export async function PUT(request, { params }) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle async params (Next.js 15+)
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { action, message, attachments } = body

    // Verify pre-ticket belongs to tenant
    const { data: preTicket, error: fetchError } = await supabaseAdmin
      .from('pre_tickets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (fetchError || !preTicket) {
      return NextResponse.json(
        { error: 'Pre-ticket not found' },
        { status: 404 }
      )
    }

    if (action === 'add_message') {
      // Add a message to the thread
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json(
          { error: 'Message is required' },
          { status: 400 }
        )
      }

      const { data: newMessage, error: messageError } = await supabaseAdmin
        .from('pre_ticket_messages')
        .insert({
          pre_ticket_id: id,
          message: message.trim(),
          attachments: attachments || [],
          created_by_tenant: true
        })
        .select()
        .single()

      if (messageError) {
        throw messageError
      }

      // Update pre-ticket updated_at
      await supabaseAdmin
        .from('pre_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        message: newMessage
      })
    } else if (action === 'finalize') {
      // Finalize pre-ticket and create actual ticket
      if (preTicket.status === 'finalized') {
        return NextResponse.json(
          { error: 'Pre-ticket already finalized' },
          { status: 400 }
        )
      }

      // Create ticket from pre-ticket
      // Use object_id (new) or building_id (old) for backward compatibility
      const objectId = preTicket.object_id || preTicket.building_id
      
      const ticketData = {
        tenant_id: tenant.id,
        object_id: objectId,
        building_id: objectId, // Keep for backward compatibility
        title: `${preTicket.category} - ${preTicket.location_details || 'Issue'}`,
        description: preTicket.description,
        category: preTicket.category,
        location_details: preTicket.location_details,
        urgency: preTicket.urgency,
        status: 'NEW',
        priority: preTicket.urgency, // Map urgency to priority
        images: preTicket.images || [],
        ai_followups: preTicket.ai_followups || [],
        ai_answers: preTicket.ai_answers || {},
        pre_ticket_id: preTicket.id
      }

      console.log('Creating ticket with data:', {
        tenant_id: ticketData.tenant_id,
        category: ticketData.category,
        status: ticketData.status
      })

      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .insert(ticketData)
        .select()
        .single()

      if (ticketError) {
        console.error('Error creating ticket:', ticketError)
        throw ticketError
      }

      console.log('Ticket created successfully:', ticket.id)

      let capmoTicketIdForEmail = null
      let objectDetails = null

      const { data: object } = await supabaseAdmin
        .from('objects')
        .select('id, name, address, street, zip, city, capmo_project_id, capmo_project_name')
        .eq('id', objectId)
        .single()

      objectDetails = object || null

      // Create Capmo ticket if mapping is available
      try {
        if (!ticket.capmo_ticket_id) {
          if (!objectDetails?.capmo_project_id) {
            console.log('Capmo ticket skipped: missing capmo_project_id', {
              ticketId: ticket.id,
              objectId: objectId
            })
            await supabaseAdmin
              .from('tickets')
              .update({ capmo_error: 'Missing capmo_project_id mapping' })
              .eq('id', ticket.id)
          } else {
            const payload = buildCapmoTicketPayload({
              ticket,
              object: objectDetails,
              tenant
            })

            console.log('Creating Capmo ticket', {
              ticketId: ticket.id,
              capmoProjectId: objectDetails.capmo_project_id,
              payload
            })

            const capmoResponse = await createProjectTicket(
              objectDetails.capmo_project_id,
              payload
            )

            console.log('Capmo ticket response', {
              ticketId: ticket.id,
              capmoResponse
            })

            const capmoTicketId =
              capmoResponse?.id ||
              capmoResponse?.ticketId ||
              capmoResponse?.ticket?.id ||
              null
            const capmoStatusRaw =
              capmoResponse?.status ||
              capmoResponse?.ticket?.status ||
              null
            const capmoStatus = normalizeCapmoStatus(capmoStatusRaw) || capmoStatusRaw || 'created'
            capmoTicketIdForEmail = capmoTicketId

            const updatePayload = {
              capmo_ticket_id: capmoTicketId,
              capmo_status: capmoStatus,
              capmo_last_synced_at: new Date().toISOString(),
              capmo_payload: payload,
              capmo_error: null
            }

            if (!capmoTicketId) {
              updatePayload.capmo_error = 'Capmo ticket created but response missing ticket id'
            }

            await supabaseAdmin
              .from('tickets')
              .update(updatePayload)
              .eq('id', ticket.id)
          }
        }
      } catch (capmoError) {
        console.error('Capmo ticket creation error:', capmoError)
        await supabaseAdmin
          .from('tickets')
          .update({
            capmo_error: capmoError?.message || 'Capmo ticket creation failed'
          })
          .eq('id', ticket.id)
      }

      try {
        await sendTicketCreatedEmails({
          ticket,
          tenant,
          object: objectDetails,
          capmoTicketId: capmoTicketIdForEmail
        })
      } catch (emailError) {
        console.error('Ticket created email error:', emailError)
      }

      // Mark pre-ticket as finalized
      const { error: updateError } = await supabaseAdmin
        .from('pre_tickets')
        .update({
          status: 'finalized',
          finalized_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        ticket: ticket
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Update pre-ticket error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

