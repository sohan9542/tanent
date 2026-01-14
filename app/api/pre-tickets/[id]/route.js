import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
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

