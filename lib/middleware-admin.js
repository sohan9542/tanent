import { cookies } from 'next/headers'
import { verifyAdminSession } from './auth/admin-session'

/**
 * Get current admin from session cookie
 */
export async function getCurrentAdmin() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('admin_session')?.value

  if (!sessionToken) {
    return null
  }

  const session = await verifyAdminSession(sessionToken)
  return session?.admin || null
}

/**
 * Get admin session token from cookie
 */
export async function getAdminSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value || null
}

/**
 * Require admin authentication (redirects if not authenticated)
 */
export async function requireAdminAuth() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    const { redirect } = await import('next/navigation')
    redirect('/admin/login')
  }
  return admin
}

