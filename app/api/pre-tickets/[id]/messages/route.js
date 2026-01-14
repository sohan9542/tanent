import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateImageFile, uploadImage, MAX_FILES } from '@/lib/storage'

/**
 * POST /api/pre-tickets/[id]/messages - Add message with file upload support
 */
export async function POST(request, { params }) {
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

    const formData = await request.formData()
    const message = formData.get('message')

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Handle attachments
    const attachmentFiles = []
    const uploadedAttachments = []

    for (let i = 0; i < MAX_FILES; i++) {
      const file = formData.get(`attachment${i}`)
      if (file && file instanceof File) {
        attachmentFiles.push(file)
      }
    }

    // Validate and upload attachments
    for (const file of attachmentFiles) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      const uploadResult = await uploadImage(file, 'pre-ticket-messages', file.name)
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

    // Create message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('pre_ticket_messages')
      .insert({
        pre_ticket_id: id,
        message: message.trim(),
        attachments: uploadedAttachments,
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
    }, { status: 201 })
  } catch (error) {
    console.error('Add message error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
