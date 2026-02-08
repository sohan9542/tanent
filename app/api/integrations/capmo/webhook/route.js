import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { normalizeCapmoStatus } from '@/lib/integrations/capmo/client'
import { sendCapmoStatusChangedEmails } from '@/lib/email/notifications'

const WEBHOOK_SECRET = process.env.CAPMO_WEBHOOK_SECRET

export async function POST(request) {
  try {
    if (!WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    const secretHeader = request.headers.get('x-capmo-webhook-secret')
    if (!secretHeader || secretHeader !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await request.json()
    const capmoTicketId =
      payload?.ticket?.id ||
      payload?.ticket_id ||
      payload?.ticketId ||
      payload?.id ||
      null
    const capmoStatusRaw =
      payload?.ticket?.status ||
      payload?.status ||
      payload?.new_status ||
      payload?.newStatus ||
      null

    if (!capmoTicketId) {
      return NextResponse.json(
        { error: 'Missing Capmo ticket id' },
        { status: 400 }
      )
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id, title, object_id, tenant_id, capmo_status, capmo_ticket_id')
      .eq('capmo_ticket_id', capmoTicketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const normalizedStatus = normalizeCapmoStatus(capmoStatusRaw) || capmoStatusRaw
    const statusChanged = normalizedStatus && normalizedStatus !== ticket.capmo_status

    await supabaseAdmin
      .from('tickets')
      .update({
        capmo_status: normalizedStatus || ticket.capmo_status,
        capmo_last_synced_at: new Date().toISOString(),
        capmo_error: null
      })
      .eq('id', ticket.id)

    if (statusChanged) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id, email, first_name, last_name')
        .eq('id', ticket.tenant_id)
        .single()

      const { data: object } = await supabaseAdmin
        .from('objects')
        .select('id, name')
        .eq('id', ticket.object_id)
        .single()

      await sendCapmoStatusChangedEmails({
        ticket,
        tenant,
        object,
        capmoStatus: normalizedStatus
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Capmo webhook error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
