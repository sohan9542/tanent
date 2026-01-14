import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * POST /api/platform/auth/login - Platform admin/staff login via Supabase Auth
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

    // Verify user is a platform user (platform_admin or platform_staff)
    const { data: platformUser, error: userError } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .eq('is_active', true)
      .single()

    if (userError || !platformUser) {
      // Sign out from Supabase Auth if not a platform user
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Access denied. This account is not authorized for platform access.' },
        { status: 403 }
      )
    }

    // Check if user has platform role
    if (platformUser.role !== 'platform_admin' && platformUser.role !== 'platform_staff') {
      await supabase.auth.signOut()
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
      // Create response with cookies set
      const response = NextResponse.json({
        success: true,
        user: {
          id: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          role: platformUser.role
        }
      })

      return response
    }

    console.error('No session after login - authData:', { user: authData.user?.id, session })
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Platform login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
