'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'
import DemoCredentialsPanel from '@/app/components/demo-credentials-panel'
import { DEMO_TENANT } from '@/lib/demo-config'

export default function LoginPage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fillDemo = () => {
    setTenantId(DEMO_TENANT.tenantId)
    setLastName(DEMO_TENANT.lastName)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId.trim(),
          lastName: lastName.trim(),
          recaptchaToken: 'bypassed',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <GoogleTranslateToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Tenant Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Tenant ID and Last Name
          </p>
        </div>

        <DemoCredentialsPanel
          title="Demo credentials"
          fields={[
            { label: 'Tenant ID', value: DEMO_TENANT.tenantId },
            { label: 'Last Name', value: DEMO_TENANT.lastName },
          ]}
          onFill={fillDemo}
        />

        <form className="mt-2 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="tenant-id" className="sr-only">Tenant ID</label>
              <input
                id="tenant-id"
                name="tenantId"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Tenant ID"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="last-name" className="sr-only">Last Name</label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link href="/platform/login" className="block text-sm text-indigo-600 hover:text-indigo-900">
              Platform Admin Login →
            </Link>
            <Link href="/org/login" className="block text-sm text-gray-500 hover:text-gray-700">
              Organization Login →
            </Link>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  )
}
