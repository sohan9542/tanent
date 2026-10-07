import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * POST /api/org/auth/login - Organization user login via Supabase Auth
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
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify user is an organization user (not platform admin)
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

    // Check if user is NOT a platform admin/staff (must be org user)
    if (platformUser.role === 'platform_admin' || platformUser.role === 'platform_staff') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'This account is for platform access. Please use platform login.' },
        { status: 403 }
      )
    }

    // Get organization memberships
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
        { error: 'Access denied. User is not a member of any organization.' },
        { status: 403 }
      )
    }

    // Set Supabase Auth session cookie
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      return NextResponse.json({
        success: true,
        user: {
          id: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          organizations: memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role
          }))
        }
      })
    }

    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Organization login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
