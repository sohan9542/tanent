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
  const emailPart = tenant.email ? `Email: ${tenant.email}` : null
  const parts = [name, emailPart].filter(Boolean)
  return parts.length > 0 ? `Tenant: ${parts.join(' | ')}` : null
}

function formatCategoryLine(ticket) {
  const parts = []
  if (ticket?.category) parts.push(`Category: ${ticket.category}`)
  if (ticket?.location_details) parts.push(`Location: ${ticket.location_details}`)
  if (ticket?.urgency) parts.push(`Urgency: ${ticket.urgency}`)
  return parts.length > 0 ? parts.join(' | ') : null
}

function formatAiFollowupQuestions(ticket) {
  const followups = Array.isArray(ticket?.ai_followups) ? ticket.ai_followups : []
  const answers = ticket?.ai_answers || {}
  if (followups.length === 0 && Object.keys(answers).length === 0) {
    return null
  }
  const sections = []
  followups.forEach((question) => {
    const answer = answers?.[question]
    if (answer) {
      sections.push(`Q: ${question}\nA: **${answer}**`)
    } else {
      sections.push(`Q: ${question}`)
    }
  })
  if (followups.length === 0) {
    Object.entries(answers).forEach(([question, answer]) => {
      if (answer) {
        sections.push(`Q: ${question}\nA: **${answer}**`)
      }
    })
  }
  return sections.length > 0 ? `AI Follow-up questions:\n\n${sections.join('\n\n')}` : null
}

function formatImages(ticket) {
  const images = Array.isArray(ticket?.images) ? ticket.images : []
  if (images.length === 0) {
    return null
  }
  const imageUrls = images
    .filter(img => img?.url)
    .map(img => img.url)
  
  if (imageUrls.length === 0) {
    return null
  }
  
  return `Images:\n${imageUrls.join('\n')}`
}

/**
 * Deadline = ticket created_at + 14 days (ISO string for Capmo).
 */
function buildDeadline(ticket) {
  const created = ticket?.created_at
  if (!created) return null
  const date = new Date(created)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + 14)
  return date.toISOString()
}

export function buildCapmoTicketPayload({ ticket, object, tenant }) {
  if (!ticket) {
    throw new Error('Ticket is required to build Capmo payload')
  }

  // Description: tenant (name, email), AI follow-up questions, images
  const descriptionSections = [
    formatTenantLine(tenant),
    formatAiFollowupQuestions(ticket),
    formatImages(ticket)
  ].filter(Boolean)

  return {
    source_id: ticket.id,
    name: (ticket.description && String(ticket.description).trim()) || buildName(ticket),
    description: descriptionSections.join('\n\n\n'),
    status: 'OPEN',
    category_id: ticket.category_id || null,
    deadline: buildDeadline(ticket)
  }
}
