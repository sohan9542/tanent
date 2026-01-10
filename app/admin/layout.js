import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import Link from 'next/link'

export default async function AdminLayout({ children }) {
  // Get current admin (won't redirect if not authenticated)
  const admin = await getCurrentAdmin()

  // If no admin, let the page handle its own auth (login page will show, others will redirect via middleware)
  if (!admin) {
    return <>{children}</>
  }

  // Admin is authenticated, show full layout
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold">Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden lg:inline text-xs sm:text-sm text-gray-600">
                {admin.name} ({admin.email})
              </span>
              <span className="lg:hidden text-xs text-gray-600">
                {admin.name}
              </span>
              <Link
                href="/admin/tenants"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Tenants
              </Link>
              <form action="/api/admin/auth/logout" method="POST">
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
      {children}
    </div>
  )
}


