import { redirect } from 'next/navigation'
import { getCurrentTenant, getSessionToken } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'

async function getTickets(tenantId, status = 'all') {
  let query = supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: tickets, error, count } = await query

  if (error) {
    console.error('Error fetching tickets:', error)
    return { tickets: [], total: 0 }
  }

  // Debug logging
  console.log(`Found ${count || 0} tickets for tenant ${tenantId} with status filter: ${status}`)
  if (tickets && tickets.length > 0) {
    console.log('Sample ticket:', {
      id: tickets[0].id,
      title: tickets[0].title,
      status: tickets[0].status,
      created_at: tickets[0].created_at
    })
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
    closed: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export default async function TicketsPage({ searchParams }) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  const status = searchParams?.status || 'all'
  const data = await getTickets(tenant.id, status)

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
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/pre-tickets"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Pre-Tickets
              </Link>
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Tickets</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Finalized tickets that have been submitted to staff. To create a ticket, finalize a pre-ticket.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/tickets"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </Link>
                <Link
                  href="/tickets?status=NEW"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'NEW'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  New
                </Link>
                <Link
                  href="/tickets?status=open"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'open'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Open
                </Link>
                <Link
                  href="/tickets?status=in_progress"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'in_progress'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  In Progress
                </Link>
                <Link
                  href="/tickets?status=resolved"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'resolved'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Resolved
                </Link>
                <Link
                  href="/tickets?status=closed"
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
                    status === 'closed'
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
                <p className="text-gray-500 mb-4">No tickets found.</p>
                <p className="text-sm text-gray-400 mb-4">
                  {status === 'all' 
                    ? "You haven't created any tickets yet. Report a defect to get started."
                    : `No tickets with status "${status}". Try viewing all tickets.`
                  }
                </p>
                {status === 'all' && (
                  <Link
                    href="/report-defect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Report a Defect
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Title
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Priority
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
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {ticket.title || `${ticket.category || 'Ticket'} - ${ticket.location_details || 'Issue'}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {ticket.status === 'NEW' ? 'New' : ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {ticket.priority}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/tickets/${ticket.id}`}
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
                      href={`/tickets/${ticket.id}`}
                      className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-900 flex-1">
                          {ticket.title || `${ticket.category || 'Ticket'} - ${ticket.location_details || 'Issue'}`}
                        </h3>
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status === 'NEW' ? 'New' : ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Priority: {ticket.priority}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
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

