import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/middleware-admin'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import BrandingManager from './BrandingManager'

export default async function AdminBrandingPage() {
  // Check authorization
  const platformUser = await getCurrentPlatformUser()
  const legacyAdmin = await requireAdminAuth()

  if (!platformUser && !legacyAdmin) {
    redirect('/admin/login')
  }

  // Logos will be fetched via API (handles organization filtering)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/tickets" className="text-gray-700 hover:text-gray-900">
                <h1 className="text-lg sm:text-xl font-semibold">Admin Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/tickets"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tickets
              </Link>
              <Link
                href="/admin/locations"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Locations
              </Link>
              <Link
                href="/admin/branding"
                className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Branding
              </Link>
              <Link
                href="/admin/settings"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Branding & Logos</h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload logos that will appear on PDF reports. Supported formats: JPG, PNG, WebP (max 5MB).
            </p>
            <BrandingManager />
          </div>
        </div>
      </main>
    </div>
  )
}
