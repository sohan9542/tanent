import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import { validateImageFile, uploadImage, MAX_FILES } from '@/lib/storage'

export async function POST(request, { params }) {
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

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id, pre_ticket_id, object_id, tenant_id, category')
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

    if (!ticket.pre_ticket_id) {
      return NextResponse.json(
        { error: 'Messaging is not available for this ticket' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const message = formData.get('message')

    if ((!message || typeof message !== 'string' || message.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const attachmentFiles = []
    const uploadedAttachments = []

    for (let i = 0; i < MAX_FILES; i++) {
      const file = formData.get(`attachment${i}`)
      if (file && file instanceof File) {
        attachmentFiles.push(file)
      }
    }

    for (const file of attachmentFiles) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      const uploadResult = await uploadImage(file, 'ticket-messages', file.name)
      if (uploadResult.error) {
        return NextResponse.json(
          { error: `Failed to upload attachment: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      uploadedAttachments.push({
        url: uploadResult.url,
        filename: file.name,
        size: file.size
      })
    }

    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('pre_ticket_messages')
      .insert({
        pre_ticket_id: ticket.pre_ticket_id,
        message: message.trim(),
        attachments: uploadedAttachments,
        created_by_tenant: false
      })
      .select()
      .single()

    if (messageError) {
      throw messageError
    }

    await supabaseAdmin
      .from('pre_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticket.pre_ticket_id)

    return NextResponse.json({
      success: true,
      message: newMessage
    }, { status: 201 })
  } catch (error) {
    console.error('Add ticket message error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
