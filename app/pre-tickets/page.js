import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'

async function getPreTickets(tenantId) {
  const { data: preTickets, error } = await supabaseAdmin
    .from('pre_tickets')
    .select(`
      *,
      object:objects(id, name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pre-tickets:', error)
    return []
  }

  return preTickets || []
}

function getStatusColor(status) {
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
    high: 'bg-red-100 text-red-800'
  }
  return colors[urgency] || 'bg-gray-100 text-gray-800'
}

export default async function PreTicketsPage() {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  const preTickets = await getPreTickets(tenant.id)

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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/tickets"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Tickets
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Pre-Tickets</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Draft reports that haven't been finalized yet. Finalize them to create tickets.
                </p>
              </div>
              <Link
                href="/report-defect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Report New Defect
              </Link>
            </div>

            {preTickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No pre-tickets found.</p>
                <Link
                  href="/report-defect"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Report a Defect
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
                          Location
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
                      {preTickets.map((preTicket) => (
                        <tr key={preTicket.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 capitalize">
                            {preTicket.category}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {preTicket.location_details || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                                preTicket.status
                              )}`}
                            >
                              {preTicket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {preTicket.urgency && (
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getUrgencyColor(
                                  preTicket.urgency
                                )}`}
                              >
                                {preTicket.urgency}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(preTicket.created_at).toLocaleDateString()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/pre-tickets/${preTicket.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {preTicket.status === 'finalized' ? 'View' : 'Continue'}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {preTickets.map((preTicket) => (
                    <Link
                      key={preTicket.id}
                      href={`/pre-tickets/${preTicket.id}`}
                      className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-900 flex-1 capitalize">
                          {preTicket.category}
                        </h3>
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                            preTicket.status
                          )}`}
                        >
                          {preTicket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {preTicket.location_details && (
                          <p>Location: {preTicket.location_details}</p>
                        )}
                        {preTicket.urgency && (
                          <p>Urgency: <span className="capitalize">{preTicket.urgency}</span></p>
                        )}
                        <p>{new Date(preTicket.created_at).toLocaleDateString()}</p>
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
