import { redirect } from 'next/navigation'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import Link from 'next/link'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'

export default async function PlatformLayout({ children }) {
  // Get current platform user
  const platformUser = await getCurrentPlatformUser()

  // If no platform user, let the page handle its own auth (login page will show)
  if (!platformUser) {
    return <>{children}</>
  }

  // Platform user is authenticated, show full layout with sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Left Sidebar - Fixed */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg flex flex-col z-10">
        <div className="p-4 border-b border-gray-200">
          <Link href="/platform/organizations" className="text-gray-700 hover:text-gray-900">
            <h1 className="text-lg sm:text-xl font-semibold">Platform Admin</h1>
          </Link>
          <p className="text-xs text-gray-500 mt-1">{platformUser.name}</p>
          <p className="text-xs text-gray-400">{platformUser.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            href="/platform/organizations"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Organizations
          </Link>
          <Link
            href="/platform/objects"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Objects
          </Link>
          <Link
            href="/platform/users"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            Users
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex justify-center">
            <GoogleTranslateToggle />
          </div>
          <form action="/api/platform/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content - Offset for fixed sidebar */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
