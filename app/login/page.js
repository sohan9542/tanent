'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Link from 'next/link'
import SiteFooter from '@/app/components/site-footer'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'
import { DEMO_PLATFORM_ADMIN } from '@/lib/demo-config'

// reCAPTCHA bypass duration in milliseconds (30 minutes)
const RECAPTCHA_BYPASS_DURATION = 30 * 60 * 1000
const RECAPTCHA_BYPASS_KEY = 'recaptcha_bypass_timestamp'

export default function LoginPage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [recaptchaError, setRecaptchaError] = useState('')
  const [recaptchaBypassed, setRecaptchaBypassed] = useState(false)
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const recaptchaRendered = useRef(false)

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    if (typeof window !== 'undefined' && siteKey) {
      const bypassTimestamp = localStorage.getItem(RECAPTCHA_BYPASS_KEY)
      if (bypassTimestamp) {
        const timestamp = parseInt(bypassTimestamp, 10)
        const now = Date.now()
        const timeElapsed = now - timestamp
        
        if (timeElapsed < RECAPTCHA_BYPASS_DURATION) {
          setRecaptchaBypassed(true)
          setRecaptchaToken('bypassed')
        } else {
          localStorage.removeItem(RECAPTCHA_BYPASS_KEY)
        }
      }
    }
  }, [siteKey])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.recaptchaCallback = (token) => {
        setRecaptchaToken(token)
        setRecaptchaError('')
        if (typeof window !== 'undefined') {
          localStorage.setItem(RECAPTCHA_BYPASS_KEY, Date.now().toString())
          setRecaptchaBypassed(true)
        }
      }

      window.recaptchaExpired = () => {
        setRecaptchaToken('')
        setRecaptchaBypassed(false)
      }

      window.recaptchaError = () => {
        setRecaptchaToken('')
        setRecaptchaBypassed(false)
        setRecaptchaError('reCAPTCHA error occurred')
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !siteKey || recaptchaBypassed || !recaptchaLoaded || recaptchaRendered.current) {
      return
    }

    const renderRecaptcha = () => {
      const container = document.getElementById('recaptcha-container')
      if (!container) {
        return false
      }

      if (container.hasChildNodes()) {
        recaptchaRendered.current = true
        return true
      }

      if (!window.grecaptcha || !window.grecaptcha.render) {
        return false
      }

      try {
        window.grecaptcha.render('recaptcha-container', {
          sitekey: siteKey,
          callback: 'recaptchaCallback',
          'expired-callback': 'recaptchaExpired',
          'error-callback': 'recaptchaError',
        })
        recaptchaRendered.current = true
        return true
      } catch (error) {
        setRecaptchaError('Failed to render reCAPTCHA')
        return false
      }
    }

    if (renderRecaptcha()) {
      return
    }

    const timeouts = []
    ;[200, 500, 1000, 2000].forEach((delay) => {
      timeouts.push(setTimeout(() => {
        if (!recaptchaRendered.current) {
          renderRecaptcha()
        }
      }, delay))
    })

    return () => timeouts.forEach(clearTimeout)
  }, [siteKey, recaptchaBypassed, recaptchaLoaded])

  useEffect(() => {
    if (recaptchaBypassed) {
      recaptchaRendered.current = false
    }
  }, [recaptchaBypassed])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (siteKey && !recaptchaToken && !recaptchaBypassed) {
      setError('Please complete the reCAPTCHA verification')
      setLoading(false)
      return
    }

    const token = recaptchaBypassed ? 'bypassed' : (recaptchaToken || (siteKey ? '' : 'dev-token'))

    if (siteKey && !token && !recaptchaBypassed) {
      setError('reCAPTCHA verification required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
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

        <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-2 text-sm">
          <p className="font-semibold text-indigo-900">Admin demo</p>
          <p className="text-indigo-800">
            Email: <code>{DEMO_PLATFORM_ADMIN.email}</code> · Password:{' '}
            <code>{DEMO_PLATFORM_ADMIN.password}</code>
          </p>
          <Link href="/platform/login" className="text-indigo-700 hover:text-indigo-900 font-medium underline">
            Platform Admin Login →
          </Link>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

          {siteKey && !recaptchaBypassed && (
            <div className="flex justify-center">
              <div id="recaptcha-container"></div>
            </div>
          )}
          {siteKey && recaptchaBypassed && (
            <div className="text-xs text-green-600 text-center mt-2">
              ✓ reCAPTCHA verification bypassed (recently verified)
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
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          onLoad={() => {
            const checkGrecaptcha = (attempt = 0) => {
              if (window.grecaptcha && window.grecaptcha.render) {
                setRecaptchaLoaded(true)
              } else if (attempt < 20) {
                setTimeout(() => checkGrecaptcha(attempt + 1), 200)
              } else {
                setRecaptchaError('reCAPTCHA API not available. Please refresh the page.')
              }
            }
            checkGrecaptcha()
          }}
          onError={() => {
            setRecaptchaError('Failed to load reCAPTCHA script. Please check your internet connection.')
          }}
          strategy="afterInteractive"
        />
      )}
      <SiteFooter />
    </div>
  )
}
