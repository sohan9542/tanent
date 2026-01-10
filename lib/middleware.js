import { cookies } from 'next/headers'
import { verifySession } from './auth/session'

/**
 * Get current tenant from session cookie
 */
export async function getCurrentTenant() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('tenant_session')?.value

  if (!sessionToken) {
    return null
  }

  const session = await verifySession(sessionToken)
  return session?.tenant || null
}

/**
 * Get session token from cookie
 */
export async function getSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get('tenant_session')?.value || null
}

/**
 * Require tenant authentication (redirects if not authenticated)
 */
export async function requireAuth() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  return tenant
}

