import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, getAccessibleBuildings } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getAccessibleObjectIds } from '@/lib/object-auth'
import Link from 'next/link'

async function getTickets(staffUser, platformUser, legacyAdmin, filters = {}) {
  let query = supabaseAdmin
    .from('tickets')
    .select(`
      *,
      tenant:tenants(id, tenant_id, first_name, last_name, building_name, unit_number),
      object:objects(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  // Platform admin sees all tickets
  const isPlatformAdmin = platformUser?.role === 'platform_admin'
  
  // If organization user (not platform admin), filter by accessible objects
  if (staffUser && !isPlatformAdmin) {
    const accessibleObjectIds = await getAccessibleObjectIds(staffUser.id)
    
    if (accessibleObjectIds.length === 0) {
      return { tickets: [], total: 0 }
    }

    // Support both object_id and building_id during migration
    query = query.or(`object_id.in.(${accessibleObjectIds.join(',')}),building_id.in.(${accessibleObjectIds.join(',')})`)
  }

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.urgency) {
    query = query.eq('urgency', filters.urgency)
  }

  const { data: tickets, error, count } = await query

  if (error) {
    console.error('Error fetching tickets:', error)
    return { tickets: [], total: 0 }
  }

  return {
    tickets: tickets || [],
    total: count || 0
  }
}

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

export default async function AdminTicketsPage({ searchParams }) {
  // Check authorization
  const platformUser = await getCurrentPlatformUser()
  const staffUser = await getCurrentStaffUser()
  const legacyAdmin = await requireAdminAuth()

  if (!platformUser && !staffUser && !legacyAdmin) {
    redirect('/admin/login')
  }

  const filters = {
    status: searchParams?.status || 'all',
    category: searchParams?.category || null,
    urgency: searchParams?.urgency || null
  }

  const data = await getTickets(staffUser, platformUser, legacyAdmin, filters)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/tenants" className="text-gray-700 hover:text-gray-900">
                <h1 className="text-lg sm:text-xl font-semibold">Admin Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/tenants"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tenants
              </Link>
              <Link
                href="/admin/tickets"
                className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tickets
              </Link>
              <form action="/api/admin/auth/logout" method="POST">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tickets</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/tickets"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    filters.status === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </Link>
                <Link
                  href="/admin/tickets?status=NEW"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    filters.status === 'NEW'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  New
                </Link>
                <Link
                  href="/admin/tickets?status=in_progress"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    filters.status === 'in_progress'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  In Progress
                </Link>
                <Link
                  href="/admin/tickets?status=resolved"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    filters.status === 'resolved'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Resolved
                </Link>
              </div>
            </div>

            {data.tickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tickets found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
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
                          Building
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
                      {data.tickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 capitalize">
                            {ticket.category || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {ticket.tenant ? `${ticket.tenant.first_name} ${ticket.tenant.last_name}` : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {ticket.object?.name || ticket.building?.name || ticket.tenant?.building_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {ticket.status.replace('_', ' ')}
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
                              href={`/admin/tickets/${ticket.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {data.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/tickets/${ticket.id}`}
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
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Tenant: {ticket.tenant ? `${ticket.tenant.first_name} ${ticket.tenant.last_name}` : 'N/A'}</p>
                        <p>Building: {ticket.object?.name || ticket.building?.name || ticket.tenant?.building_name || 'N/A'}</p>
                        {ticket.urgency && (
                          <p>Urgency: <span className="capitalize">{ticket.urgency}</span></p>
                        )}
                        <p>{new Date(ticket.created_at).toLocaleDateString()}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
