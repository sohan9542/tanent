import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import PreTicketThread from '@/app/pre-tickets/[id]/pre-ticket-thread'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'

async function getTicketData(id, tenantId) {
  const { data: preTicket } = await supabaseAdmin
    .from('pre_tickets')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (preTicket) {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('pre_ticket_id', preTicket.id)
      .eq('tenant_id', tenantId)
      .single()

    const { data: messages } = await supabaseAdmin
      .from('pre_ticket_messages')
      .select('*')
      .eq('pre_ticket_id', preTicket.id)
      .order('created_at', { ascending: true })

    return { preTicket, ticket: ticket || null, messages: messages || [] }
  }

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!ticket) {
    return null
  }

  let messages = []
  let preTicketData = null
  if (ticket.pre_ticket_id) {
    const { data: preTicketById } = await supabaseAdmin
      .from('pre_tickets')
      .select('*')
      .eq('id', ticket.pre_ticket_id)
      .eq('tenant_id', tenantId)
      .single()

    preTicketData = preTicketById || null

    const { data: preTicketMessages } = await supabaseAdmin
      .from('pre_ticket_messages')
      .select('*')
      .eq('pre_ticket_id', ticket.pre_ticket_id)
      .order('created_at', { ascending: true })

    messages = preTicketMessages || []
  }

  return { preTicket: preTicketData, ticket, messages }
}

function getTicketStatusColor(status) {
  const colors = {
    NEW: 'bg-blue-100 text-blue-800',
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getPreTicketStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    finalized: 'bg-green-100 text-green-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getUrgencyColor(urgency) {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }
  return colors[urgency] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status) {
  const statusMap = {
    'NEW': 'New',
    'open': 'Open',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed',
    'draft': 'Draft',
    'in_review': 'In Review',
    'finalized': 'Finalized',
  }
  return statusMap[status] || status
}

function formatDateTime(date) {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

export default async function TicketDetailPage({ params }) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  const data = await getTicketData(params.id, tenant.id)

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h1>
          <Link href="/tickets" className="text-indigo-600 hover:text-indigo-900">
            Back to Tickets
          </Link>
        </div>
      </div>
    )
  }

  const { preTicket, ticket, messages } = data
  const description = preTicket?.description || ticket?.description
  const category = preTicket?.category || ticket?.category
  const locationDetails = preTicket?.location_details || ticket?.location_details
  const urgency = preTicket?.urgency || ticket?.urgency
  const images = preTicket?.images || ticket?.images || []
  const aiAnswers = preTicket?.ai_answers || ticket?.ai_answers || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                <h1 className="text-lg sm:text-xl font-semibold">Tenant Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/tickets"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">My Tickets</span>
                <span className="sm:hidden">Tickets</span>
              </Link>
              <GoogleTranslateToggle />
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link
            href="/tickets"
            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
          >
            ← Back to Tickets
          </Link>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">
                  {category ? `${category} Defect` : 'Ticket'}
                </h2>
                {locationDetails && (
                  <p className="text-gray-600">Location: {locationDetails}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {preTicket && (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getPreTicketStatusColor(
                      preTicket.status
                    )}`}
                  >
                    {getStatusLabel(preTicket.status)}
                  </span>
                )}
                {ticket && (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getTicketStatusColor(
                      ticket.status
                    )}`}
                  >
                    {ticket.current_org_role
                      ? ticket.current_org_role.replace('_', ' ')
                      : getStatusLabel(ticket.status)
                    }
                  </span>
                )}
                {urgency && (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getUrgencyColor(
                      urgency
                    )}`}
                  >
                    {urgency} Urgency
                  </span>
                )}
              </div>
            </div>

            <div className="prose max-w-none mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{description || 'No description provided'}</p>
            </div>

            {images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <a
                      key={index}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md hover:opacity-80 transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {aiAnswers && Object.keys(aiAnswers).length > 0 && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-md">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">Additional Information</h3>
                <div className="space-y-3">
                  {Object.entries(aiAnswers).map(([question, answer], index) => (
                    answer && (
                      <div key={index}>
                        <p className="text-sm font-medium text-gray-700 mb-1">{question}</p>
                        <p className="text-sm text-gray-600">{answer}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-gray-200 pt-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime((ticket || preTicket).created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime((ticket || preTicket).updated_at)}
                  </dd>
                </div>
                {ticket?.capmo_status && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Capmo Status</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {ticket.capmo_status}
                    </dd>
                  </div>
                )}
                {ticket?.capmo_last_synced_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Capmo Last Synced</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDateTime(ticket.capmo_last_synced_at)}
                    </dd>
                  </div>
                )}
                {ticket?.resolved_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDateTime(ticket.resolved_at)}
                    </dd>
                  </div>
                )}
                {preTicket?.finalized_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Finalized At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDateTime(preTicket.finalized_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {preTicket ? (
            <PreTicketThread
              preTicketId={preTicket.id}
              initialMessages={messages}
              isFinalized={preTicket.status === 'finalized'}
            />
          ) : (
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <p className="text-sm text-gray-600">
                Messaging is only available for tickets created from pre-tickets.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

