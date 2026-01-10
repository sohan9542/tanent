'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

export default function LoginPage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [recaptchaError, setRecaptchaError] = useState('')

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  // Set up callbacks on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Callback for reCAPTCHA v2 when user completes the challenge
      window.recaptchaCallback = (token) => {
        setRecaptchaToken(token)
        setRecaptchaError('')
        console.log('reCAPTCHA token received')
      }

      // Callback for reCAPTCHA v2 when it expires
      window.recaptchaExpired = () => {
        setRecaptchaToken('')
        console.log('reCAPTCHA token expired')
      }

      // Callback for reCAPTCHA v2 errors
      window.recaptchaError = () => {
        setRecaptchaToken('')
        setRecaptchaError('reCAPTCHA error occurred')
        console.error('reCAPTCHA error')
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // For v2, check if reCAPTCHA is completed
    if (siteKey && !recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      setLoading(false)
      return
    }

    // If no site key configured, allow (dev mode)
    const token = recaptchaToken || (siteKey ? '' : 'dev-token')

    if (siteKey && !token) {
      setError('reCAPTCHA verification required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantId.trim(),
          lastName: lastName.trim(),
          recaptchaToken: token
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Tenant Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Tenant ID and Last Name
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="tenant-id" className="sr-only">
                Tenant ID
              </label>
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
              <label htmlFor="last-name" className="sr-only">
                Last Name
              </label>
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

          {/* reCAPTCHA v2 checkbox */}
          {siteKey && (
            <div className="flex justify-center">
              <div
                id="recaptcha-container"
                className="g-recaptcha"
                data-sitekey={siteKey}
                data-callback="recaptchaCallback"
                data-expired-callback="recaptchaExpired"
                data-error-callback="recaptchaError"
              ></div>
            </div>
          )}
          {recaptchaError && (
            <div className="text-xs text-yellow-600 text-center mt-2">
              ⚠ {recaptchaError}
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
        </form>
      </div>

      {siteKey && (
        <Script
          src="https://www.google.com/recaptcha/api.js"
          onError={() => {
            setRecaptchaError('Failed to load reCAPTCHA script')
            console.error('reCAPTCHA script failed to load')
          }}
          strategy="lazyOnload"
        />
      )}
    </div>
  )
}


