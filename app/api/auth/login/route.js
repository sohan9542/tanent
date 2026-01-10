import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTenantCredentials } from '@/lib/auth/verify'
import { createSession, deleteAllTenantSessions, getSessionCookieName } from '@/lib/auth/session'
import { verifyCaptcha } from '@/lib/captcha'
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'
import { validateLogin } from '@/utils/validation'

export async function POST(request) {
  try {
    const body = await request.json()
    const { tenantId, lastName, recaptchaToken } = body

    // Validate input
    const validation = validateLogin({ tenantId, lastName, recaptchaToken })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      )
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Check rate limiting
    const rateLimit = isRateLimited(ip)
    if (rateLimit.limited) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      )
    }

    // Verify reCAPTCHA
    const captchaValid = await verifyCaptcha(recaptchaToken)
    if (!captchaValid) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }

    // Verify tenant credentials
    const tenant = await verifyTenantCredentials(tenantId.trim(), lastName.trim())
    
    if (!tenant) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Clear previous attempts
    clearAttempts(ip)

    // Delete old sessions for this tenant
    await deleteAllTenantSessions(tenant.id)

    // Create new session
    const userAgent = request.headers.get('user-agent') || ''
    const session = await createSession(tenant.id, ip, userAgent)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        tenantId: tenant.tenant_id,
        firstName: tenant.first_name
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}


