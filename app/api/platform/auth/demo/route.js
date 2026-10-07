import { NextResponse } from 'next/server'
import { DEMO_PLATFORM_ADMIN } from '@/lib/demo-config'
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
} from '@/lib/demo-session'

/**
 * POST /api/platform/auth/demo
 * Start an offline / portfolio demo platform session (no Supabase required).
 */
export async function POST() {
  try {
    const token = createDemoSessionToken('platform')
    const response = NextResponse.json({
      success: true,
      demo: true,
      user: {
        id: DEMO_PLATFORM_ADMIN.id,
        email: DEMO_PLATFORM_ADMIN.email,
        name: DEMO_PLATFORM_ADMIN.name,
        role: DEMO_PLATFORM_ADMIN.role,
      },
      message: 'Demo session started. Showing sample platform data.',
    })

    response.cookies.set(DEMO_SESSION_COOKIE, token, demoSessionCookieOptions())
    return response
  } catch (error) {
    console.error('Demo platform session error:', error)
    return NextResponse.json(
      { error: 'Could not start demo session' },
      { status: 500 }
    )
  }
}
