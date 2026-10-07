import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTenantCredentials } from '@/lib/auth/verify'
import {
  createSession,
  deleteAllTenantSessions,
  getSessionCookieName,
} from '@/lib/auth/session'
import { verifyCaptcha } from '@/lib/captcha'
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
} from '@/lib/rate-limit'
import { validateLogin } from '@/utils/validation'
import { DEMO_TENANT, isDemoTenantCredentials } from '@/lib/demo-config'
import {
  DEMO_COOKIE,
  createStaticDemoToken,
  demoCookieOptions,
} from '@/lib/demo-session'

export async function POST(request) {
  try {
    const body = await request.json()
    const { tenantId, lastName, recaptchaToken } = body

    const validation = validateLogin({ tenantId, lastName, recaptchaToken })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      )
    }

    // Static portfolio demo — zero DB / Supabase
    if (isDemoTenantCredentials(tenantId, lastName)) {
      const response = NextResponse.json({
        success: true,
        demo: true,
        tenant: {
          id: DEMO_TENANT.id,
          tenantId: DEMO_TENANT.tenantId,
          firstName: DEMO_TENANT.firstName,
        },
      })
      response.cookies.set(
        DEMO_COOKIE,
        createStaticDemoToken('tenant'),
        demoCookieOptions()
      )
      return response
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateLimit = isRateLimited(ip)
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    const captchaValid = await verifyCaptcha(recaptchaToken)
    if (!captchaValid) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }

    try {
      const tenant = await verifyTenantCredentials(
        tenantId.trim(),
        lastName.trim()
      )

      if (!tenant) {
        recordFailedAttempt(ip)
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      clearAttempts(ip)
      await deleteAllTenantSessions(tenant.id)

      const userAgent = request.headers.get('user-agent') || ''
      const session = await createSession(tenant.id, ip, userAgent)

      const cookieStore = await cookies()
      cookieStore.set(getSessionCookieName(), session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60,
        path: '/',
      })

      return NextResponse.json({
        success: true,
        tenant: {
          id: tenant.id,
          tenantId: tenant.tenant_id,
          firstName: tenant.first_name,
        },
      })
    } catch (dbError) {
      console.error('Tenant login DB error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
