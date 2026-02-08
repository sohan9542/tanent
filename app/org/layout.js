import { redirect } from 'next/navigation'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import Link from 'next/link'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'

export default async function OrgLayout({ children }) {
  // Get current organization user
  const staffUser = await getCurrentStaffUser()

  // If no staff user, let the page handle its own auth (login page will show)
  if (!staffUser) {
    return <>{children}</>
  }

  const primaryOrg = staffUser.memberships?.[0]?.organization

  // Organization user is authenticated, show full layout with sidebar
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/org/dashboard" className="text-gray-700 hover:text-gray-900">
            <h1 className="text-lg sm:text-xl font-semibold">
              {primaryOrg?.name || 'Organization'}
            </h1>
          </Link>
          <p className="text-xs text-gray-500 mt-1">{staffUser.name}</p>
          <p className="text-xs text-gray-400">{staffUser.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/org/dashboard"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/org/users"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Users
          </Link>
          <Link
            href="/org/objects"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Objects
          </Link>
          <Link
            href="/org/craftsmen"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Craftsmen
          </Link>
          <Link
            href="/org/tickets"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Tickets
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex justify-center">
            <GoogleTranslateToggle />
          </div>
          <form action="/api/org/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
