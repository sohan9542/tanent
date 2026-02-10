import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getProjectTicket, normalizeCapmoStatus } from '@/lib/integrations/capmo/client'
import { sendCapmoStatusChangedEmails } from '@/lib/email/notifications'

const CRON_SECRET = process.env.CRON_SECRET
const POLL_INTERVAL_MINUTES = 2

export async function POST(request) {
  try {
    // Check if this is a Vercel Cron job (has x-vercel-signature header)
    const vercelSignature = request.headers.get('x-vercel-signature')
    const isVercelCron = !!vercelSignature

    // If not Vercel Cron, require CRON_SECRET header
    if (!isVercelCron) {
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
    }

    // Select tickets ready for polling:
    // - Has capmo_ticket_id
    // - Status is not CLOSED
    // - capmo_next_poll_at <= now() (or NULL for first-time polling)
    const now = new Date().toISOString()
    
    // Query tickets where capmo_next_poll_at is NULL or <= now()
    // PostgREST syntax: field.is.null,field.lte.value (ISO timestamp without quotes)
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        title,
        status,
        capmo_ticket_id,
        capmo_status,
        capmo_last_notified_status,
        object_id,
        tenant_id,
        object:objects(id, name, capmo_project_id)
      `)
      .not('capmo_ticket_id', 'is', null)
      .neq('capmo_status', 'CLOSED')
      .or(`capmo_next_poll_at.is.null,capmo_next_poll_at.lte.${now}`)
      .limit(100)

    if (error) {
      throw error
    }

    const results = {
      checked: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      emails_sent: 0
    }

    for (const ticket of tickets || []) {
      results.checked += 1

      // Skip CLOSED tickets (check both uppercase and normalized forms)
      if (ticket.capmo_status === 'CLOSED' || ticket.capmo_status === 'Closed') {
        results.skipped += 1
        continue
      }

      if (!ticket.object?.capmo_project_id) {
        await supabaseAdmin
          .from('tickets')
          .update({ capmo_error: 'Missing capmo_project_id mapping' })
          .eq('id', ticket.id)
        results.skipped += 1
        continue
      }

      try {
        // Fetch ticket from Capmo API
        const capmoResponse = await getProjectTicket(
          ticket.object.capmo_project_id,
          ticket.capmo_ticket_id
        )

        // Extract status from Capmo response
        const capmoStatusRaw =
          capmoResponse?.data?.status ||
          capmoResponse?.status ||
          capmoResponse?.ticket?.status ||
          null
        const normalizedStatus = normalizeCapmoStatus(capmoStatusRaw) || capmoStatusRaw

        if (!normalizedStatus) {
          console.warn(`No status found in Capmo response for ticket ${ticket.id}`)
          results.skipped += 1
          continue
        }

        const oldStatus = ticket.capmo_status
        const statusChanged = normalizedStatus !== oldStatus
        const isClosed = normalizedStatus === 'CLOSED' || normalizedStatus === 'Closed'

        // Calculate next poll time: NULL if CLOSED, otherwise now + 30 minutes
        const nextPollAt = isClosed
          ? null
          : new Date(Date.now() + POLL_INTERVAL_MINUTES * 60 * 1000).toISOString()

        // Prepare update payload
        const updatePayload = {
          capmo_status: normalizedStatus,
          capmo_last_synced_at: new Date().toISOString(),
          capmo_next_poll_at: nextPollAt,
          capmo_error: null
        }

        // If status changed, check if we need to send email
        if (statusChanged) {
          // Only send email if this status is different from the last notified status
          const shouldNotify = normalizedStatus !== ticket.capmo_last_notified_status

          if (shouldNotify) {
            // Fetch tenant data for email
            const { data: tenant } = await supabaseAdmin
              .from('tenants')
              .select('id, email, first_name, last_name')
              .eq('id', ticket.tenant_id)
              .single()

            // Send email notification
            await sendCapmoStatusChangedEmails({
              ticket,
              tenant,
              object: ticket.object,
              oldStatus,
              newStatus: normalizedStatus
            })

            // Update notification tracking fields
            updatePayload.capmo_last_notified_status = normalizedStatus
            updatePayload.capmo_last_notified_at = new Date().toISOString()
            results.emails_sent += 1
          }

          results.updated += 1
        }

        // Update ticket with new status and polling schedule
        await supabaseAdmin
          .from('tickets')
          .update(updatePayload)
          .eq('id', ticket.id)
      } catch (pollError) {
        console.error(`Capmo poll error for ticket ${ticket.id}:`, pollError)
        // Log error but continue processing other tickets
        await supabaseAdmin
          .from('tickets')
          .update({
            capmo_error: pollError?.message || 'Capmo poll failed',
            // Schedule retry in 30 minutes even on error
            capmo_next_poll_at: new Date(Date.now() + POLL_INTERVAL_MINUTES * 60 * 1000).toISOString()
          })
          .eq('id', ticket.id)
        results.errors += 1
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Capmo poll error:', error)
    return NextResponse.json(
      { error: 'An error occurred', details: error.message },
      { status: 500 }
    )
  }
}
