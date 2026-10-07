import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  DEMO_PLATFORM_ADMIN,
  isDemoModeEnabled,
  matchesDemoPlatformCredentials,
} from '@/lib/demo-config'
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
  isSupabaseEnvConfigured,
} from '@/lib/demo-session'
import { isSupabaseConfigured } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function demoLoginResponse() {
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
    message: 'Signed in with demo admin (offline / portfolio mode).',
  })
  response.cookies.set(DEMO_SESSION_COOKIE, token, demoSessionCookieOptions())
  return response
}

/**
 * POST /api/platform/auth/login - Platform admin/staff login via Supabase Auth
 * Falls back to a signed demo session for documented demo credentials when
 * DEMO_MODE is on, Supabase is unavailable, or real auth fails.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const isDemoCreds = matchesDemoPlatformCredentials(email, password)
    const skipRealAuth =
      isDemoCreds && (isDemoModeEnabled() || !isSupabaseEnvConfigured())

    if (skipRealAuth) {
      return demoLoginResponse()
    }

    if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
      if (isDemoCreds) {
        return demoLoginResponse()
      }
      return NextResponse.json(
        {
          error: 'Authentication backend is unavailable. Use the demo admin credentials or Preview offline demo.',
          demoAvailable: true,
        },
        { status: 503 }
      )
    }

    try {
      const { supabaseAdmin } = await import('@/lib/supabase/server')

      // Create server client with cookie handling
      const cookieStore = await cookies()
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              cookieStore.set(name, value, options)
            },
            remove(name, options) {
              cookieStore.set(name, '', options)
            },
          },
        }
      )

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (authError || !authData.user) {
        // Demo credentials: fall back when seed user is missing or auth fails
        if (isDemoCreds) {
          return demoLoginResponse()
        }
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify user is a platform user (platform_admin or platform_staff)
      const { data: platformUser, error: userError } = await supabaseAdmin
        .from('platform_users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .eq('is_active', true)
        .single()

      if (userError || !platformUser) {
        await supabase.auth.signOut()
        if (isDemoCreds) {
          return demoLoginResponse()
        }
        return NextResponse.json(
          { error: 'Access denied. This account is not authorized for platform access.' },
          { status: 403 }
        )
      }

      // Check if user has platform role
      if (platformUser.role !== 'platform_admin' && platformUser.role !== 'platform_staff') {
        await supabase.auth.signOut()
        if (isDemoCreds) {
          return demoLoginResponse()
        }
        return NextResponse.json(
          { error: 'Access denied. This account is not authorized for platform access.' },
          { status: 403 }
        )
      }

      // Get session to verify it was set
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
      }
      
      if (session) {
        return NextResponse.json({
          success: true,
          user: {
            id: platformUser.id,
            email: platformUser.email,
            name: platformUser.name,
            role: platformUser.role
          }
        })
      }

      console.error('No session after login - authData:', { user: authData.user?.id, session })
      if (isDemoCreds) {
        return demoLoginResponse()
      }
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    } catch (authInfraError) {
      console.error('Platform auth infrastructure error:', authInfraError)
      if (isDemoCreds) {
        return demoLoginResponse()
      }
      return NextResponse.json(
        {
          error: 'Authentication backend is unavailable. Use the demo admin credentials or Preview offline demo.',
          demoAvailable: true,
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Platform login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
