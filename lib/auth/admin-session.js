import { supabaseAdmin } from '../supabase/server'
import { randomUUID } from 'crypto'

const ADMIN_SESSION_COOKIE_NAME = 'admin_session'
const ADMIN_SESSION_DURATION_HOURS = 8 // Shorter session for admin

/**
 * Create a new admin session
 */
export async function createAdminSession(adminId, ipAddress, userAgent) {
  const sessionToken = randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ADMIN_SESSION_DURATION_HOURS)

  const { error } = await supabaseAdmin
    .from('admin_sessions')
    .insert({
      admin_id: adminId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    })

  if (error) {
    throw new Error('Failed to create admin session')
  }

  // Update last login time
  await supabaseAdmin
    .from('admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminId)

  return {
    token: sessionToken,
    expiresAt
  }
}

/**
 * Verify and get admin from session token
 */
export async function verifyAdminSession(sessionToken) {
  if (!sessionToken) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('admin_sessions')
    .select('admin_id, expires_at, admin:admins(*)')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return null
  }

  return {
    adminId: data.admin_id,
    admin: data.admin
  }
}

/**
 * Delete admin session
 */
export async function deleteAdminSession(sessionToken) {
  if (!sessionToken) {
    return
  }

  await supabaseAdmin
    .from('admin_sessions')
    .delete()
    .eq('session_token', sessionToken)
}

/**
 * Delete all sessions for an admin (on new login)
 */
export async function deleteAllAdminSessions(adminId) {
  await supabaseAdmin
    .from('admin_sessions')
    .delete()
    .eq('admin_id', adminId)
}

/**
 * Get admin session cookie name
 */
export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE_NAME
}

