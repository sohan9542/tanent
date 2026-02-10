import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail } from './resend'

function getAppBaseUrl() {
  const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function getTenantTicketUrl(ticketId) {
  const base = getAppBaseUrl()
  return base ? `${base}/tickets/${ticketId}` : null
}

function getOrgTicketUrl(ticketId) {
  const base = getAppBaseUrl()
  return base ? `${base}/org/tickets/${ticketId}` : null
}

function buildHtmlEmail({ heading, lines, ticketUrl }) {
  const safeLines = (lines || []).filter(Boolean)
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>${heading}</h2>
      ${safeLines.map((line) => `<p>${line}</p>`).join('')}
      ${ticketUrl ? `<p><a href="${ticketUrl}">View ticket</a></p>` : ''}
    </div>
  `
}

function buildTextEmail({ heading, lines, ticketUrl }) {
  const safeLines = (lines || []).filter(Boolean)
  return [
    heading,
    '',
    ...safeLines,
    ticketUrl ? `View ticket: ${ticketUrl}` : null
  ].filter(Boolean).join('\n')
}

async function fetchOrgAdminEmails(objectId) {
  if (!objectId) return []

  const { data: assignment } = await supabaseAdmin
    .from('object_assignments')
    .select('owner_org_id, tech_org_id, warranty_org_id')
    .eq('object_id', objectId)
    .single()

  if (!assignment) return []

  const orgIds = [assignment.owner_org_id, assignment.tech_org_id, assignment.warranty_org_id]
    .filter(Boolean)

  if (orgIds.length === 0) return []

  const { data: memberships } = await supabaseAdmin
    .from('organization_memberships')
    .select('organization_id, role, user:platform_users(email, name)')
    .in('organization_id', orgIds)
    .eq('role', 'org_admin')

  const emails = (memberships || [])
    .map((membership) => membership.user?.email)
    .filter(Boolean)

  return Array.from(new Set(emails))
}

export async function sendTicketCreatedEmails({ ticket, tenant, object, capmoTicketId }) {
  if (!ticket) return

  const tenantEmail = tenant?.email
  const tenantUrl = getTenantTicketUrl(ticket.id)
  const orgUrl = getOrgTicketUrl(ticket.id)

  if (tenantEmail) {
    const subject = `Ticket created: ${ticket.title || 'New ticket'}`
    const heading = 'Your ticket has been created'
    const lines = [
      `Title: ${ticket.title || 'N/A'}`,
      `Status: ${ticket.status || 'N/A'}`
    ]
    await sendEmail({
      to: tenantEmail,
      subject,
      html: buildHtmlEmail({ heading, lines, ticketUrl: tenantUrl }),
      text: buildTextEmail({ heading, lines, ticketUrl: tenantUrl }),
      eventKey: `${ticket.id}:ticket_created:tenant`,
      eventType: 'ticket_created',
      ticketId: ticket.id
    })
  }

  const internalRecipients = await fetchOrgAdminEmails(ticket.object_id)
  if (internalRecipients.length > 0) {
    const subject = `New ticket created: ${ticket.title || ticket.id}`
    const heading = 'A new ticket has been created'
    const lines = [
      `Title: ${ticket.title || 'N/A'}`,
      `Status: ${ticket.status || 'N/A'}`,
      object?.name ? `Object: ${object.name}` : null,
      capmoTicketId ? `Capmo Ticket ID: ${capmoTicketId}` : null
    ]
    await sendEmail({
      to: internalRecipients,
      subject,
      html: buildHtmlEmail({ heading, lines, ticketUrl: orgUrl }),
      text: buildTextEmail({ heading, lines, ticketUrl: orgUrl }),
      eventKey: `${ticket.id}:ticket_created:internal`,
      eventType: 'ticket_created',
      ticketId: ticket.id
    })
  }
}

export async function sendCapmoStatusChangedEmails({ ticket, tenant, object, oldStatus, newStatus }) {
  if (!ticket || !newStatus) return

  const tenantEmail = tenant?.email
  const tenantUrl = getTenantTicketUrl(ticket.id)
  const orgUrl = getOrgTicketUrl(ticket.id)

  // Build status change message
  const statusChange = oldStatus
    ? `${oldStatus} → ${newStatus}`
    : newStatus

  if (tenantEmail) {
    const subject = `Ticket status updated: ${ticket.title || 'Your ticket'}`
    const heading = 'Your ticket status has changed'
    const lines = [
      `Title: ${ticket.title || 'N/A'}`,
      object?.name ? `Object: ${object.name}` : null,
      `Status: ${statusChange}`
    ].filter(Boolean)
    await sendEmail({
      to: tenantEmail,
      subject,
      html: buildHtmlEmail({ heading, lines, ticketUrl: tenantUrl }),
      text: buildTextEmail({ heading, lines, ticketUrl: tenantUrl }),
      eventKey: `${ticket.id}:capmo_status:${newStatus}:tenant`,
      eventType: 'status_changed',
      ticketId: ticket.id
    })
  }

  const internalRecipients = await fetchOrgAdminEmails(ticket.object_id)
  if (internalRecipients.length > 0) {
    const subject = `Ticket status updated: ${ticket.title || ticket.id}`
    const heading = 'Ticket status changed in Capmo'
    const lines = [
      `Title: ${ticket.title || 'N/A'}`,
      object?.name ? `Object: ${object.name}` : null,
      `Status: ${statusChange}`,
      ticket.capmo_ticket_id ? `Capmo Ticket ID: ${ticket.capmo_ticket_id}` : null
    ].filter(Boolean)
    await sendEmail({
      to: internalRecipients,
      subject,
      html: buildHtmlEmail({ heading, lines, ticketUrl: orgUrl }),
      text: buildTextEmail({ heading, lines, ticketUrl: orgUrl }),
      eventKey: `${ticket.id}:capmo_status:${newStatus}:internal`,
      eventType: 'status_changed',
      ticketId: ticket.id
    })
  }
}
