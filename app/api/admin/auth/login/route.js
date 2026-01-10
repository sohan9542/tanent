import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminCredentials } from '@/lib/auth/admin-verify'
import { createAdminSession, deleteAllAdminSessions, getAdminSessionCookieName } from '@/lib/auth/admin-session'
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
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

    // Verify admin credentials
    const admin = await verifyAdminCredentials(email.trim(), password)
    
    if (!admin) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Clear previous attempts
    clearAttempts(ip)

    // Delete old sessions for this admin
    await deleteAllAdminSessions(admin.id)

    // Create new session
    const userAgent = request.headers.get('user-agent') || ''
    const session = await createAdminSession(admin.id, ip, userAgent)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set(getAdminSessionCookieName(), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}

