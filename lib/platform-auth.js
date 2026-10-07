import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getStaticDemoSession,
  getStaticDemoPlatformUser,
} from './demo-session'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get current platform user from static demo session or Supabase Auth
 */
export async function getCurrentPlatformUser() {
  try {
    const demo = await getStaticDemoSession()
    if (demo?.kind === 'platform') {
      return getStaticDemoPlatformUser()
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    const { createServerClient } = await import('@supabase/ssr')
    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // ignore in Server Components
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, '', options)
          } catch {
            // ignore
          }
        },
      },
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { supabaseAdmin } = await import('./supabase/server')
    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (platformError || !platformUser) {
      return null
    }

    if (
      platformUser.role === 'platform_admin' ||
      platformUser.role === 'platform_staff'
    ) {
      return platformUser
    }

    return null
  } catch (error) {
    console.error('Error getting platform user:', error)
    return null
  }
}

export async function isPlatformAdmin() {
  const user = await getCurrentPlatformUser()
  return user?.role === 'platform_admin'
}

export async function isPlatformStaff() {
  const user = await getCurrentPlatformUser()
  return user?.role === 'platform_staff' || user?.role === 'platform_admin'
}

export async function requirePlatformAdmin() {
  const user = await getCurrentPlatformUser()
  if (!user || user.role !== 'platform_admin') {
    const { redirect } = await import('next/navigation')
    redirect('/platform/login')
  }
  return user
}
