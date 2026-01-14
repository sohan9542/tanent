'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'

/**
 * Legacy admin login page - redirects to new login pages
 */
export default function AdminLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to platform login (for backward compatibility)
    // Users can choose platform or organization login from there
    router.push('/platform/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to login...</p>
        <Link href="/platform/login" className="text-indigo-600 hover:text-indigo-900">
          Go to Platform Login
        </Link>
        {' | '}
        <Link href="/org/login" className="text-indigo-600 hover:text-indigo-900">
          Go to Organization Login
        </Link>
      </div>
      <SiteFooter />
    </div>
  )
}

