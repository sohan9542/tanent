function buildShortId(id) {
  if (!id || typeof id !== 'string') return 'unknown'
  return id.split('-')[0] || id.slice(0, 8)
}

function buildName(ticket) {
  const category = ticket?.category || 'Ticket'
  const location = ticket?.location_details
  if (location) {
    return `${category} - ${location}`
  }
  return `${category} - Ticket #${buildShortId(ticket?.id)}`
}

function formatObjectLine(object) {
  if (!object) return null
  const name = object.name ? object.name : null
  const addressParts = [object.street, object.zip, object.city].filter(Boolean)
  const addressLine = addressParts.length > 0 ? addressParts.join(' ') : null
  const addressNotes = object.address ? object.address : null
  const parts = [name, addressLine, addressNotes].filter(Boolean)
  return parts.length > 0 ? `Object: ${parts.join(', ')}` : null
}

function formatTenantLine(tenant) {
  if (!tenant) return null
  const name = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ')
  const tenantId = tenant.tenant_id ? `(${tenant.tenant_id})` : null
  const parts = [name, tenantId].filter(Boolean)
  return parts.length > 0 ? `Tenant: ${parts.join(' ')}` : null
}

function formatCategoryLine(ticket) {
  const parts = []
  if (ticket?.category) parts.push(`Category: ${ticket.category}`)
  if (ticket?.location_details) parts.push(`Location: ${ticket.location_details}`)
  if (ticket?.urgency) parts.push(`Urgency: ${ticket.urgency}`)
  return parts.length > 0 ? parts.join(' | ') : null
}

function formatAiFollowups(ticket) {
  const followups = Array.isArray(ticket?.ai_followups) ? ticket.ai_followups : []
  const answers = ticket?.ai_answers || {}
  if (followups.length === 0 && Object.keys(answers).length === 0) {
    return null
  }
  const lines = []
  followups.forEach((question) => {
    const answer = answers?.[question]
    if (answer) {
      lines.push(`- ${question}: ${answer}`)
    } else {
      lines.push(`- ${question}`)
    }
  })
  if (followups.length === 0) {
    Object.entries(answers).forEach(([question, answer]) => {
      if (answer) {
        lines.push(`- ${question}: ${answer}`)
      }
    })
  }
  return lines.length > 0 ? `AI Follow-ups:\n${lines.join('\n')}` : null
}

function formatImages(images = []) {
  if (!Array.isArray(images) || images.length === 0) {
    return null
  }
  const urls = images.map((image) => image?.url).filter(Boolean)
  if (urls.length === 0) return null
  return `Images:\n${urls.join('\n')}`
}

export function buildCapmoTicketPayload({ ticket, object, tenant }) {
  if (!ticket) {
    throw new Error('Ticket is required to build Capmo payload')
  }

  const descriptionSections = [
    formatObjectLine(object),
    formatTenantLine(tenant),
    formatCategoryLine(ticket),
    ticket.description ? `Tenant Description:\n${ticket.description}` : null,
    formatAiFollowups(ticket),
    formatImages(ticket.images || [])
  ].filter(Boolean)

  return {
    source_id: ticket.id,
    name: buildName(ticket),
    description: descriptionSections.join('\n\n'),
    status: 'OPEN'
  }
}
