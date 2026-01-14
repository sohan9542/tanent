import { redirect } from 'next/navigation'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import Link from 'next/link'

/**
 * Legacy admin layout - supports both platform and organization users
 * For backward compatibility with /admin/* routes
 */
export default async function AdminLayout({ children }) {
  // Try platform user first
  const platformUser = await getCurrentPlatformUser()
  const staffUser = await getCurrentStaffUser()

  // If no user, let the page handle its own auth
  if (!platformUser && !staffUser) {
    return <>{children}</>
  }

  const user = platformUser || staffUser
  const isPlatform = !!platformUser

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold">
                {isPlatform ? 'Platform Admin' : 'Organization Admin'}
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden lg:inline text-xs sm:text-sm text-gray-600">
                {user.name} ({user.email})
              </span>
              <span className="lg:hidden text-xs text-gray-600">
                {user.name}
              </span>
              {isPlatform ? (
                <>
                  <Link
                    href="/platform/organizations"
                    className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/platform/objects"
                    className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                  >
                    Objects
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/org/dashboard"
                    className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                </>
              )}
              <Link
                href="/admin/tickets"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Tickets
              </Link>
              <form action={isPlatform ? "/api/platform/auth/logout" : "/api/org/auth/logout"} method="POST">
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


