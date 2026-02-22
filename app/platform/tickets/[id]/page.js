import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import Link from 'next/link'
import TicketActions from './TicketActions'

async function getTicket(id, platformUser) {
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      tenant:tenants(id, tenant_id, first_name, last_name, email, phone, building_name, unit_number),
      object:objects(id, name, address)
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return null
  }

  // Platform admin can access all tickets
  // Get pre-ticket messages if exists
  let messages = []
  if (ticket.pre_ticket_id) {
    const { data: preTicketMessages } = await supabaseAdmin
      .from('pre_ticket_messages')
      .select('*')
      .eq('pre_ticket_id', ticket.pre_ticket_id)
      .order('created_at', { ascending: true })

    messages = preTicketMessages || []
  }

  return {
    ...ticket,
    messages
  }
}

function getStatusColor(status) {
  const colors = {
    NEW: 'bg-blue-100 text-blue-800',
    Open: 'bg-blue-100 text-blue-800',
    'In Review': 'bg-yellow-100 text-yellow-800',
    Closed: 'bg-gray-100 text-gray-800',
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getUrgencyColor(urgency) {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }
  return colors[urgency] || 'bg-gray-100 text-gray-800'
}

export default async function PlatformTicketDetailPage({ params }) {
  // Check authorization - platform users only
  const platformUser = await getCurrentPlatformUser()

  if (!platformUser) {
    redirect('/platform/login')
  }

  const ticket = await getTicket(params.id, platformUser)

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket not found</h1>
          <Link href="/platform/tickets" className="text-indigo-600 hover:text-indigo-900">
            Back to tickets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Link
        href="/platform/tickets"
        className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
      >
        ← Back to tickets
      </Link>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {ticket.category ? ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1) : 'Ticket'} Defect
            </h2>
            {ticket.location_details && (
              <p className="text-gray-600">Location: {ticket.location_details}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getStatusColor(
                ticket.status
              )}`}
            >
              {ticket.status.replace('_', ' ')}
            </span>
            {ticket.urgency && (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getUrgencyColor(
                  ticket.urgency
                )}`}
              >
                {ticket.urgency} urgency
              </span>
            )}
          </div>
        </div>

        {/* Tenant Info */}
        {ticket.tenant && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Tenant Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 text-gray-900">
                  {ticket.tenant.first_name} {ticket.tenant.last_name}
                </span>
              </div>
              {ticket.tenant.email && (
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 text-gray-900">{ticket.tenant.email}</span>
                </div>
              )}
              {ticket.tenant.phone && (
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 text-gray-900">{ticket.tenant.phone}</span>
                </div>
              )}
              {ticket.tenant.unit_number && (
                <div>
                  <span className="text-gray-500">Unit:</span>
                  <span className="ml-2 text-gray-900">{ticket.tenant.unit_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="prose max-w-none mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
        </div>

        {/* Images */}
        {ticket.images && ticket.images.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {ticket.images.map((image, index) => (
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

        {/* AI Answers */}
        {ticket.ai_answers && Object.keys(ticket.ai_answers).length > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 rounded-md">
            <h3 className="text-sm font-semibold text-indigo-900 mb-3">Additional Information</h3>
            <div className="space-y-3">
              {Object.entries(ticket.ai_answers).map(([question, answer], index) => (
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

        {/* Message Thread */}
        {ticket.messages && ticket.messages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Message Thread</h3>
            <div className="space-y-4">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.created_by_tenant ? 'bg-indigo-50 ml-4' : 'bg-gray-50 mr-4'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {msg.created_by_tenant ? 'Tenant' : 'Staff'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap mb-2">{msg.message}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {msg.attachments.map((att, index) => (
                        <a
                          key={index}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={att.url}
                            alt={att.filename}
                            className="w-full h-24 object-cover rounded-md hover:opacity-80 transition"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket Actions - Status, Warranty Flag, Handoff, Activity Log */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <TicketActions
            ticketId={ticket.id}
            initialStatus={ticket.status}
            initialWarrantyFlag={ticket.warranty_flag || false}
          />
        </div>

        {/* Metadata */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(ticket.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(ticket.updated_at).toLocaleString()}
              </dd>
            </div>
            {ticket.resolved_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(ticket.resolved_at).toLocaleString()}
                </dd>
              </div>
            )}
            {ticket.capmo_ticket_id && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Capmo Ticket ID</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ticket.capmo_ticket_id}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
