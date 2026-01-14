import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/middleware'
import Link from 'next/link'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold">Tenant Portal</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/pre-tickets"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">My Pre-Tickets</span>
                <span className="sm:hidden">Drafts</span>
              </Link>
              <Link
                href="/tickets"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">My Tickets</span>
                <span className="sm:hidden">Tickets</span>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Welcome, {tenant.first_name}!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Profile Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.tenant_id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {tenant.first_name} {tenant.last_name}
                    </dd>
                  </div>
                  {tenant.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.email}</dd>
                    </div>
                  )}
                  {tenant.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.phone}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Residence Information</h3>
                <dl className="space-y-3">
                  {tenant.building_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Building</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.building_name}</dd>
                    </div>
                  )}
                  {tenant.unit_number && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Unit Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.unit_number}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/report-defect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Report a Defect
              </Link>
              <Link
                href="/pre-tickets"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                My Pre-Tickets (Drafts)
              </Link>
              <Link
                href="/tickets"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                My Tickets (Finalized)
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


