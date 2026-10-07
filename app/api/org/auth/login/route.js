import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DEMO_ORG_USER, isDemoOrgCredentials } from '@/lib/demo-config'
import {
  DEMO_COOKIE,
  createStaticDemoToken,
  demoCookieOptions,
} from '@/lib/demo-session'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function staticDemoLoginResponse() {
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
  })
  response.cookies.set(
    DEMO_COOKIE,
    createStaticDemoToken('org'),
    demoCookieOptions()
  )
  return response
}

/**
 * POST /api/org/auth/login
 * Static demo credentials succeed with zero DB/Supabase calls.
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

    if (isDemoOrgCredentials(email, password)) {
      return staticDemoLoginResponse()
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    try {
      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const cookieStore = await cookies()
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
      })

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      const { data: platformUser, error: userError } = await supabaseAdmin
        .from('platform_users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .eq('is_active', true)
        .single()

      if (userError || !platformUser) {
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: 'Access denied. User not found.' },
          { status: 403 }
        )
      }

      if (
        platformUser.role === 'platform_admin' ||
        platformUser.role === 'platform_staff'
      ) {
        await supabase.auth.signOut()
        return NextResponse.json(
          {
            error:
              'This account is for platform access. Please use platform login.',
          },
          { status: 403 }
        )
      }

      const { data: memberships, error: membershipError } = await supabaseAdmin
        .from('organization_memberships')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq('user_id', platformUser.id)

      if (membershipError || !memberships || memberships.length === 0) {
        await supabase.auth.signOut()
        return NextResponse.json(
          {
            error:
              'Access denied. User is not a member of any organization.',
          },
          { status: 403 }
        )
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        return NextResponse.json({
          success: true,
          user: {
            id: platformUser.id,
            email: platformUser.email,
            name: platformUser.name,
            organizations: memberships.map((m) => ({
              id: m.organization.id,
              name: m.organization.name,
              role: m.role,
            })),
          },
        })
      }

      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    } catch (err) {
      console.error('Organization login Supabase error:', err)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Organization login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
