import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'

async function getTickets(tenantId) {
  const { data: preTickets, error } = await supabaseAdmin
    .from('pre_tickets')
    .select(`
      *,
      ticket:tickets(id, status, priority, created_at, updated_at, resolved_at, current_org_role)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return { tickets: [], total: 0 }
  }

  const normalized = (preTickets || []).map((item) => ({
    ...item,
    ticket: Array.isArray(item.ticket) ? item.ticket[0] : item.ticket
  }))

  return {
    tickets: normalized,
    total: normalized.length
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

function getPreTicketStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    finalized: 'bg-green-100 text-green-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
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

function formatDate(date) {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export default async function TicketsPage() {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  const data = await getTickets(tenant.id)

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
                href="/report-defect"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Report Defect
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Tickets</h2>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage your reported defects
                </p>
              </div>
              <Link
                href="/report-defect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Report Defect
              </Link>
            </div>

            {data.tickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No tickets yet</p>
                <p className="text-sm text-gray-400 mb-4">
                  You haven't reported any defects yet. Click the button below to get started.
                </p>
                <Link
                  href="/report-defect"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Report Defect
                </Link>
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
                          Status
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Stage
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
                      {data.tickets.map((item) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="capitalize">{item.category}</div>
                            {item.location_details && (
                              <div className="text-xs text-gray-500">{item.location_details}</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {item.ticket ? (
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                                  item.ticket.status
                                )}`}
                              >
                                {item.ticket.current_org_role
                                  ? item.ticket.current_org_role.replace('_', ' ')
                                  : getStatusLabel(item.ticket.status)
                                }
                              </span>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPreTicketStatusColor(
                                  item.status
                                )}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {item.ticket ? 'Finalized' : 'Draft'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/tickets/${item.id}`}
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
                  {data.tickets.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tickets/${item.id}`}
                      className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-900 flex-1 capitalize">
                          {item.category}
                        </h3>
                        {item.ticket ? (
                          <span
                            className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                              item.ticket.status
                            )}`}
                          >
                            {item.ticket.current_org_role
                              ? item.ticket.current_org_role.replace('_', ' ')
                              : getStatusLabel(item.ticket.status)
                            }
                          </span>
                        ) : (
                          <span
                            className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPreTicketStatusColor(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{item.ticket ? 'Finalized' : 'Draft'}</span>
                        <span>{formatDate(item.created_at)}</span>
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

