import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabase/server'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Get Supabase Auth client for browser
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get current platform user from Supabase Auth session
 * Returns platform user with platform_admin or platform_staff role, or null
 */
export async function getCurrentPlatformUser() {
  try {
    // Get Supabase Auth session from cookies
    const { createServerClient } = await import('@supabase/ssr')
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
            try {
              // Only set cookies in Route Handlers or Server Actions
              // In Server Components, this will fail silently
              cookieStore.set(name, value, options)
            } catch (err) {
              // Ignore cookie modification errors in Server Components
              // Cookies can only be modified in Route Handlers/Server Actions
            }
          },
          remove(name, options) {
            try {
              // Only remove cookies in Route Handlers or Server Actions
              cookieStore.set(name, '', options)
            } catch (err) {
              // Ignore cookie modification errors in Server Components
            }
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get platform user record
    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (platformError || !platformUser) {
      return null
    }

    // Only return if user has platform role
    if (platformUser.role === 'platform_admin' || platformUser.role === 'platform_staff') {
      return platformUser
    }

    return null
  } catch (error) {
    console.error('Error getting platform user:', error)
    return null
  }
}

/**
 * Check if user is platform admin
 */
export async function isPlatformAdmin() {
  const user = await getCurrentPlatformUser()
  return user?.role === 'platform_admin'
}

/**
 * Check if user is platform staff
 */
export async function isPlatformStaff() {
  const user = await getCurrentPlatformUser()
  return user?.role === 'platform_staff' || user?.role === 'platform_admin'
}

/**
 * Require platform admin (throws/redirects if not)
 */
export async function requirePlatformAdmin() {
  const user = await getCurrentPlatformUser()
  if (!user || user.role !== 'platform_admin') {
    const { redirect } = await import('next/navigation')
    redirect('/platform/login')
  }
  return user
}
