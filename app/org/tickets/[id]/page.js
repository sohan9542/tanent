import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket } from '@/lib/staff-auth'
import Link from 'next/link'
import TicketThread from './ticket-thread'
import TicketActions from './ticket-actions'

function getStatusColor(status) {
  const colors = {
    NEW: 'bg-blue-100 text-blue-800',
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

function getOrgRoles(assignment, organizationId) {
  if (!assignment || !organizationId) {
    return []
  }

  const roles = []
  if (assignment.owner_org_id === organizationId) {
    roles.push('Owner')
  }
  if (assignment.tech_org_id === organizationId) {
    roles.push('Technical')
  }
  if (assignment.warranty_org_id === organizationId) {
    roles.push('Warranty')
  }

  return roles
}

async function getTicket(id, staffUser, organizationId) {
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

  const canAccess = await canAccessTicket(staffUser, ticket)
  if (!canAccess) {
    return null
  }

  let messages = []
  if (ticket.pre_ticket_id) {
    const { data: preTicketMessages } = await supabaseAdmin
      .from('pre_ticket_messages')
      .select('*')
      .eq('pre_ticket_id', ticket.pre_ticket_id)
      .order('created_at', { ascending: true })

    messages = preTicketMessages || []
  }

  let assignment = null
  if (ticket.object_id) {
    const { data: assignmentData } = await supabaseAdmin
      .from('object_assignments')
      .select('object_id, owner_org_id, tech_org_id, warranty_org_id')
      .eq('object_id', ticket.object_id)
      .single()

    assignment = assignmentData
  }

  return {
    ticket,
    messages,
    assignment,
    organizationId
  }
}

export default async function OrgTicketDetailPage({ params }) {
  const staffUser = await getCurrentStaffUser()

  if (!staffUser) {
    redirect('/org/login')
  }

  const primaryOrg = staffUser.memberships?.[0]?.organization
  if (!primaryOrg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h1>
          <p className="text-gray-600">You are not a member of any organization.</p>
        </div>
      </div>
    )
  }

  const data = await getTicket(params.id, staffUser, primaryOrg.id)

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket not found</h1>
          <Link href="/org/tickets" className="text-indigo-600 hover:text-indigo-900">
            Back to tickets
          </Link>
        </div>
      </div>
    )
  }

  const { ticket, messages, assignment, organizationId } = data
  const roles = getOrgRoles(assignment, organizationId)

  return (
    <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/org/tickets"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to tickets
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 capitalize">
                {ticket.category ? `${ticket.category} Defect` : 'Ticket'}
              </h2>
              {ticket.location_details && (
                <p className="text-gray-600">Location: {ticket.location_details}</p>
              )}
              {ticket.object?.name && (
                <p className="text-sm text-gray-500 mt-1">Object: {ticket.object.name}</p>
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

          {roles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Role</h3>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Stage</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700">
                {ticket.current_org_role ? ticket.current_org_role.replace('_', ' ') : 'Unassigned'}
              </span>
            </div>
          </div>

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

          <div className="prose max-w-none mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
          </div>

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

          <div className="border-t border-gray-200 pt-6">
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
            </dl>
          </div>
        </div>

        {ticket.pre_ticket_id ? (
          <TicketThread
            ticketId={ticket.id}
            initialMessages={messages}
            orgLabel={roles[0] ? `${roles[0]} Organization` : primaryOrg.name}
          />
        ) : (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <p className="text-sm text-gray-600">
              Messaging is only available for tickets created from pre-tickets.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <TicketActions
            ticketId={ticket.id}
            currentRole={ticket.current_org_role}
            roles={roles}
          />
        </div>
      </div>
    </main>
  )
}
