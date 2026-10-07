import { cookies } from 'next/headers'
import { verifySession } from './auth/session'
import {
  getStaticDemoSession,
  getStaticDemoTenant,
} from './demo-session'

/**
 * Get current tenant from static demo session or DB session cookie
 */
export async function getCurrentTenant() {
  const demo = await getStaticDemoSession()
  if (demo?.kind === 'tenant') {
    return getStaticDemoTenant()
  }

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('tenant_session')?.value

  if (!sessionToken) {
    return null
  }

  try {
    const session = await verifySession(sessionToken)
    return session?.tenant || null
  } catch {
    return null
  }
}

export async function getSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get('tenant_session')?.value || null
}

export async function requireAuth() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  return tenant
}
