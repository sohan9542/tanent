import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO

function getResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing')
  }
  return new Resend(RESEND_API_KEY)
}

function normalizeRecipients(to) {
  if (!to) return []
  if (Array.isArray(to)) return to.filter(Boolean)
  return [to].filter(Boolean)
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  eventKey,
  eventType,
  ticketId,
  replyTo
}) {
  const recipients = normalizeRecipients(to)
  if (recipients.length === 0) {
    return { skipped: true, reason: 'No recipients' }
  }

  if (!RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is missing')
  }

  if (eventKey) {
    const { error: insertError } = await supabaseAdmin
      .from('email_events')
      .insert({
        ticket_id: ticketId || null,
        event_type: eventType || 'generic',
        event_key: eventKey,
        sent_to: recipients.join(',')
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return { skipped: true, reason: 'Duplicate event' }
      }
      throw insertError
    }
  }

  const resend = getResendClient()
  const response = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: recipients,
    subject,
    html,
    text,
    reply_to: replyTo || RESEND_REPLY_TO || undefined
  })

  if (response?.error) {
    throw new Error(response.error.message || 'Failed to send email')
  }

  return { success: true }
}
