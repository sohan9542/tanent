import { NextResponse } from 'next/server'
import { DEMO_ORG_USER } from '@/lib/demo-config'
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
} from '@/lib/demo-session'

/**
 * POST /api/org/auth/demo
 * Start an offline / portfolio demo organization session (no Supabase required).
 */
export async function POST() {
  try {
    const token = createDemoSessionToken('org')
    const response = NextResponse.json({
      success: true,
      demo: true,
      user: {
        id: DEMO_ORG_USER.id,
        email: DEMO_ORG_USER.email,
        name: DEMO_ORG_USER.name,
        organizations: DEMO_ORG_USER.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        })),
      },
      message: 'Demo session started. Showing sample organization data.',
    })

    response.cookies.set(DEMO_SESSION_COOKIE, token, demoSessionCookieOptions())
    return response
  } catch (error) {
    console.error('Demo org session error:', error)
    return NextResponse.json(
      { error: 'Could not start demo session' },
      { status: 500 }
    )
  }
}
