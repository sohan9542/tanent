'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'
import DemoCredentialsPanel from '@/app/components/demo-credentials-panel'
import { DEMO_PLATFORM_ADMIN } from '@/lib/demo-config'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/platform/auth/check', { 
          method: 'GET',
          credentials: 'include' // Include cookies
        })
        if (response.ok) {
          router.push('/platform/organizations')
        }
      } catch (err) {
        // Not logged in, stay on login page — demo credentials remain visible
      }
    }
    checkAuth()
  }, [router])

  const fillDemoCredentials = () => {
    setEmail(DEMO_PLATFORM_ADMIN.email)
    setPassword(DEMO_PLATFORM_ADMIN.password)
    setError('')
    setInfo('Demo credentials filled. Click Sign in, or use Preview offline demo if the API is down.')
  }

  const startOfflineDemo = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const response = await fetch('/api/platform/auth/demo', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || 'Could not start offline demo')
        setLoading(false)
        return
      }

      setInfo(data.message || 'Demo session started.')
      setTimeout(() => {
        router.push('/platform/organizations')
        router.refresh()
      }, 100)
    } catch (err) {
      console.error('Offline demo error:', err)
      // Last-resort client path when even the demo API is unreachable
      setError('Backend unreachable. Opening static demo preview…')
      setLoading(false)
      router.push('/platform/demo')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const response = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request/response
        body: JSON.stringify({
          email: email.trim(),
          password: password
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = data.error || 'Login failed'
        setError(message)
        if (data.demoAvailable) {
          setInfo('You can still explore the portfolio with Preview offline demo below.')
        }
        setLoading(false)
        return
      }

      if (data.demo) {
        setInfo(data.message || 'Signed in with demo admin.')
      }

      // Success - wait a moment for cookies to be set, then redirect
      setTimeout(() => {
        router.push('/platform/organizations')
        router.refresh()
      }, 100)
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error — authentication backend looks unavailable.')
      setInfo('Demo credentials are still shown above. Use Preview offline demo to continue.')
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
          title="Demo admin"
          email={DEMO_PLATFORM_ADMIN.email}
          password={DEMO_PLATFORM_ADMIN.password}
          onFill={fillDemoCredentials}
          onOfflinePreview={startOfflineDemo}
          offlinePreviewLabel="Preview offline demo"
        />

        <form className="mt-2 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
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
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
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
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {info && (
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-800">{info}</div>
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
            <Link
              href="/org/login"
              className="block text-sm text-indigo-600 hover:text-indigo-900"
            >
              Organization Login →
            </Link>
            <Link
              href="/platform/demo"
              className="block text-sm text-gray-500 hover:text-gray-700"
            >
              Static demo preview (no login)
            </Link>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  )
}
