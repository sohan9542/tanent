'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'
import DemoCredentialsPanel from '@/app/components/demo-credentials-panel'
import { DEMO_ORG_USER } from '@/lib/demo-config'

function OrgLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [loadingLogo, setLoadingLogo] = useState(false)

  // Fetch logo if organization ID is provided
  useEffect(() => {
    const orgId = searchParams.get('id')
    if (orgId) {
      setLoadingLogo(true)
      fetch(`/api/org/logo/get?id=${orgId}`)
        .then(res => res.json())
        .then(data => {
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl)
          }
        })
        .catch(err => {
          console.error('Failed to load logo:', err)
        })
        .finally(() => {
          setLoadingLogo(false)
        })
    }
  }, [searchParams])

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/org/auth/check', { 
          method: 'GET',
          credentials: 'include' // Include cookies
        })
        if (response.ok) {
          router.push('/org/dashboard')
        }
      } catch (err) {
        // Not logged in — demo credentials remain visible
      }
    }
    checkAuth()
  }, [router])

  const fillDemoCredentials = () => {
    setEmail(DEMO_ORG_USER.email)
    setPassword(DEMO_ORG_USER.password)
    setError('')
    setInfo('Demo credentials filled. Click Sign in, or use Preview offline demo if the API is down.')
  }

  const startOfflineDemo = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const response = await fetch('/api/org/auth/demo', {
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
      router.push('/org/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Offline demo error:', err)
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
      const response = await fetch('/api/org/auth/login', {
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
        setError(data.error || 'Login failed')
        if (data.demoAvailable) {
          setInfo('You can still explore the portfolio with Preview offline demo below.')
        }
        setLoading(false)
        return
      }

      if (data.demo) {
        setInfo(data.message || 'Signed in with demo org user.')
      }

      // Success - redirect to organization dashboard
      router.push('/org/dashboard')
      router.refresh()
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
          {logoUrl && (
            <div className="flex justify-center mb-6">
              <img
                src={logoUrl}
                alt="Organization logo"
                className="w-[150px] object-contain"
              />
            </div>
          )}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Organization Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your organization dashboard
          </p>
          {loadingLogo && (
            <p className="mt-1 text-center text-xs text-gray-400">Loading branding…</p>
          )}
        </div>

        <DemoCredentialsPanel
          title="Demo organization user"
          email={DEMO_ORG_USER.email}
          password={DEMO_ORG_USER.password}
          onFill={fillDemoCredentials}
          onOfflinePreview={startOfflineDemo}
          offlinePreviewLabel="Preview offline demo"
          hint="Portfolio demo account for organization users. Values stay visible even if the backend is down."
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

          <div className="text-center">
            <Link
              href="/platform/login"
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Platform Admin Login →
            </Link>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function OrgLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Organization Login</h2>
          <p className="text-sm text-gray-600">Loading…</p>
          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 text-left text-sm">
            <p className="font-semibold text-indigo-900">Demo organization user</p>
            <p className="mt-2 text-indigo-800">
              Email: <code>{DEMO_ORG_USER.email}</code>
            </p>
            <p className="text-indigo-800">
              Password: <code>{DEMO_ORG_USER.password}</code>
            </p>
          </div>
        </div>
      </div>
    }>
      <OrgLoginForm />
    </Suspense>
  )
}
