import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

function createSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const adminClient = createSupabaseAdmin()

/**
 * Server-side client with service role (bypasses RLS).
 * When Supabase env is missing (e.g. portfolio DEMO_MODE), accessing the
 * client throws a clear error so demo session paths can handle it.
 */
export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!adminClient) {
        throw new Error(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use DEMO_MODE.'
        )
      }
      const value = adminClient[prop]
      return typeof value === 'function' ? value.bind(adminClient) : value
    },
  }
)
