import { redirect } from 'next/navigation'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { getAccessibleObjectIds } from '@/lib/object-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'

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

async function getTickets(staffUser, organizationId, filters = {}) {
  const accessibleObjectIds = await getAccessibleObjectIds(staffUser.id)
  if (!accessibleObjectIds.length) {
    return { tickets: [], total: 0, assignmentMap: new Map() }
  }

  let query = supabaseAdmin
    .from('tickets')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name, unit_number, building_name),
      object:objects(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  query = query.or(`object_id.in.(${accessibleObjectIds.join(',')}),building_id.in.(${accessibleObjectIds.join(',')})`)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.urgency && filters.urgency !== 'all') {
    query = query.eq('urgency', filters.urgency)
  }

  const { data: tickets, error, count } = await query

  if (error) {
    console.error('Error fetching tickets:', error)
    return { tickets: [], total: 0, assignmentMap: new Map() }
  }

  const objectIds = Array.from(new Set((tickets || []).map((ticket) => ticket.object_id).filter(Boolean)))
  let assignmentMap = new Map()

  if (objectIds.length) {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('object_assignments')
      .select('object_id, owner_org_id, tech_org_id, warranty_org_id')
      .in('object_id', objectIds)

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError)
    } else {
      assignmentMap = new Map(assignments.map((assignment) => [assignment.object_id, assignment]))
    }
  }

  return {
    tickets: tickets || [],
    total: count || 0,
    assignmentMap
  }
}

export default async function OrgTicketsPage({ searchParams }) {
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

  const filters = {
    status: searchParams?.status || 'all',
    urgency: searchParams?.urgency || 'all'
  }

  const data = await getTickets(staffUser, primaryOrg.id, filters)

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tickets</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tickets for objects assigned to {primaryOrg.name}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/org/tickets"
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  filters.status === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </Link>
              <Link
                href="/org/tickets?status=NEW"
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  filters.status === 'NEW'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                New
              </Link>
              <Link
                href="/org/tickets?status=in_progress"
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  filters.status === 'in_progress'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                In Progress
              </Link>
              <Link
                href="/org/tickets?status=resolved"
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  filters.status === 'resolved'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Resolved
              </Link>
              <Link
                href="/org/tickets?status=closed"
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  filters.status === 'closed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Closed
              </Link>
            </div>
          </div>

          {data.tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tickets found.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Category
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tenant
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Object
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Your Role
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Urgency
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.tickets.map((ticket) => {
                      const roles = getOrgRoles(data.assignmentMap.get(ticket.object_id), primaryOrg.id)
                      return (
                        <tr key={ticket.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 capitalize">
                            {ticket.category || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {ticket.tenant ? `${ticket.tenant.first_name} ${ticket.tenant.last_name}` : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {ticket.object?.name || ticket.tenant?.building_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {roles.length === 0 ? (
                              'N/A'
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {roles.map((role) => (
                                  <span
                                    key={role}
                                    className="inline-flex rounded-full px-2 text-xs font-semibold bg-indigo-100 text-indigo-800"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {ticket.current_org_role
                                ? ticket.current_org_role.replace('_', ' ')
                                : ticket.status.replace('_', ' ')
                              }
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {ticket.urgency && (
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getUrgencyColor(
                                  ticket.urgency
                                )}`}
                              >
                                {ticket.urgency}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/org/tickets/${ticket.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {data.tickets.map((ticket) => {
                  const roles = getOrgRoles(data.assignmentMap.get(ticket.object_id), primaryOrg.id)
                  return (
                    <Link
                      key={ticket.id}
                      href={`/org/tickets/${ticket.id}`}
                      className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-900 flex-1 capitalize">
                          {ticket.category || 'Ticket'}
                        </h3>
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.current_org_role
                            ? ticket.current_org_role.replace('_', ' ')
                            : ticket.status.replace('_', ' ')
                          }
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Tenant: {ticket.tenant ? `${ticket.tenant.first_name} ${ticket.tenant.last_name}` : 'N/A'}</p>
                        <p>Object: {ticket.object?.name || ticket.tenant?.building_name || 'N/A'}</p>
                        {roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex rounded-full px-2 text-[10px] font-semibold bg-indigo-100 text-indigo-800"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                        {ticket.urgency && <p>Urgency: <span className="capitalize">{ticket.urgency}</span></p>}
                        <p>{new Date(ticket.created_at).toLocaleDateString()}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
