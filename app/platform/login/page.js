'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'
import DemoCredentialsPanel from '@/app/components/demo-credentials-panel'
import { DEMO_PLATFORM_ADMIN } from '@/lib/demo-config'

export const dynamic = 'force-dynamic'

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/platform/auth/check', {
          method: 'GET',
          credentials: 'include',
        })
        if (response.ok) {
          router.push('/platform/organizations')
        }
      } catch {
        // stay on login
      }
    }
    checkAuth()
  }, [router])

  const fillDemo = () => {
    setEmail(DEMO_PLATFORM_ADMIN.email)
    setPassword(DEMO_PLATFORM_ADMIN.password)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      setTimeout(() => {
        router.push('/platform/organizations')
        router.refresh()
      }, 100)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Platform Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage the platform
          </p>
        </div>

        <DemoCredentialsPanel
          title="Demo credentials"
          fields={[
            { label: 'Email', value: DEMO_PLATFORM_ADMIN.email },
            { label: 'Password', value: DEMO_PLATFORM_ADMIN.password },
          ]}
          onFill={fillDemo}
        />

        <form className="mt-2 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="text-center">
            <Link href="/org/login" className="text-sm text-indigo-600 hover:text-indigo-900">
              Organization Login →
            </Link>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  )
}
