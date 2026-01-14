import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabase/server'
import { getAccessibleObjectIds, canAccessTicket as checkObjectTicketAccess } from './object-auth'
import { getCurrentPlatformUser } from './platform-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Get current organization user (not platform admin/staff)
 * Returns user with organization memberships and object roles
 */
export async function getCurrentStaffUser() {
  try {
    // First check if it's a platform user
    const platformUser = await getCurrentPlatformUser()
    if (platformUser) {
      // Platform users are handled separately
      return null
    }

    // Get Supabase Auth session
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
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

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get platform user record (could be org user)
    const { data: platformUserRecord, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (platformError || !platformUserRecord) {
      return null
    }

    // If user has platform role, they're not an org user
    if (platformUserRecord.role === 'platform_admin' || platformUserRecord.role === 'platform_staff') {
      return null
    }

    // Get organization memberships
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('*, organization:organizations(*)')
      .eq('user_id', platformUserRecord.id)

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError)
      return null
    }

    // Get object roles
    const { data: objectRoles, error: rolesError } = await supabaseAdmin
      .from('object_roles')
      .select('*, object:objects(*), organization:organizations(*)')
      .eq('user_id', platformUserRecord.id)

    return {
      ...platformUserRecord,
      memberships: memberships || [],
      objectRoles: objectRoles || []
    }
  } catch (error) {
    console.error('Error getting staff user:', error)
    return null
  }
}

/**
 * Check if user is admin in any organization
 */
export function isOrganizationAdmin(staffUser) {
  if (!staffUser || !staffUser.memberships) {
    return false
  }
  return staffUser.memberships.some(m => m.role === 'org_admin')
}

/**
 * Get accessible object IDs for staff user
 */
export async function getAccessibleBuildings(staffUser) {
  if (!staffUser || !staffUser.id) {
    return []
  }
  return await getAccessibleObjectIds(staffUser.id)
}

/**
 * Check if staff user can access a ticket
 */
export async function canAccessTicket(staffUser, ticket) {
  if (!staffUser || !staffUser.id || !ticket) {
    return false
  }
  return await checkObjectTicketAccess(staffUser.id, ticket)
}

/**
 * Get user's organizations
 */
export function getUserOrganizations(staffUser) {
  if (!staffUser || !staffUser.memberships) {
    return []
  }
  return staffUser.memberships.map(m => m.organization).filter(Boolean)
}
