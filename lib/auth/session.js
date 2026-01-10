import { supabaseAdmin } from '../supabase/server'
import { randomUUID } from 'crypto'

const SESSION_COOKIE_NAME = 'tenant_session'
const SESSION_DURATION_HOURS = 24

/**
 * Create a new tenant session
 */
export async function createSession(tenantId, ipAddress, userAgent) {
  const sessionToken = randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS)

  const { error } = await supabaseAdmin
    .from('tenant_sessions')
    .insert({
      tenant_id: tenantId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    })

  if (error) {
    throw new Error('Failed to create session')
  }

  return {
    token: sessionToken,
    expiresAt
  }
}

/**
 * Verify and get tenant from session token
 */
export async function verifySession(sessionToken) {
  if (!sessionToken) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_sessions')
    .select('tenant_id, expires_at, tenant:tenants(*)')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return null
  }

  return {
    tenantId: data.tenant_id,
    tenant: data.tenant
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionToken) {
  if (!sessionToken) {
    return
  }

  await supabaseAdmin
    .from('tenant_sessions')
    .delete()
    .eq('session_token', sessionToken)
}

/**
 * Delete all sessions for a tenant (on new login)
 */
export async function deleteAllTenantSessions(tenantId) {
  await supabaseAdmin
    .from('tenant_sessions')
    .delete()
    .eq('tenant_id', tenantId)
}

/**
 * Get session cookie name
 */
export function getSessionCookieName() {
  return SESSION_COOKIE_NAME
}


