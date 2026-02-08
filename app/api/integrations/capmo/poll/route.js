import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getProjectTicket, normalizeCapmoStatus } from '@/lib/integrations/capmo/client'
import { sendCapmoStatusChangedEmails } from '@/lib/email/notifications'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const secretHeader = request.headers.get('x-cron-secret')
    if (!secretHeader || secretHeader !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        title,
        status,
        capmo_ticket_id,
        capmo_status,
        object_id,
        tenant_id,
        object:objects(id, name, capmo_project_id)
      `)
      .not('capmo_ticket_id', 'is', null)
      .neq('status', 'closed')

    if (error) {
      throw error
    }

    const results = {
      checked: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    }

    for (const ticket of tickets || []) {
      results.checked += 1

      if (!ticket.object?.capmo_project_id) {
        await supabaseAdmin
          .from('tickets')
          .update({ capmo_error: 'Missing capmo_project_id mapping' })
          .eq('id', ticket.id)
        results.skipped += 1
        continue
      }

      try {
        const capmoResponse = await getProjectTicket(
          ticket.object.capmo_project_id,
          ticket.capmo_ticket_id
        )

        const capmoStatusRaw =
          capmoResponse?.status ||
          capmoResponse?.ticket?.status ||
          null
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

          await sendCapmoStatusChangedEmails({
            ticket,
            tenant,
            object: ticket.object,
            capmoStatus: normalizedStatus
          })
          results.updated += 1
        }
      } catch (pollError) {
        console.error('Capmo poll error:', pollError)
        await supabaseAdmin
          .from('tickets')
          .update({ capmo_error: pollError?.message || 'Capmo poll failed' })
          .eq('id', ticket.id)
        results.errors += 1
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Capmo poll error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
