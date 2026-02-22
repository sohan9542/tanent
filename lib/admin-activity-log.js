import { supabaseAdmin } from './supabase/server'
import { getCurrentPlatformUser } from './platform-auth'
import { getCurrentStaffUser } from './staff-auth'
import { getCurrentAdmin } from './middleware-admin'

/**
 * Get current admin user info for activity logging
 * Returns { id, email } or null
 */
export async function getCurrentAdminForLogging() {
  // Try platform user first
  const platformUser = await getCurrentPlatformUser()
  if (platformUser) {
    return {
      id: platformUser.id,
      email: platformUser.email
    }
  }

  // Try staff user
  const staffUser = await getCurrentStaffUser()
  if (staffUser) {
    return {
      id: staffUser.id,
      email: staffUser.email
    }
  }

  // Try legacy admin
  const legacyAdmin = await getCurrentAdmin()
  if (legacyAdmin) {
    return {
      id: legacyAdmin.id,
      email: legacyAdmin.email
    }
  }

  return null
}

/**
 * Log an activity for a ticket
 */
export async function logTicketActivity({
  ticketId,
  actionType,
  actionDetails = {},
  adminUser = null
}) {
  if (!ticketId || !actionType) {
    console.error('Missing required fields for activity log:', { ticketId, actionType })
    return null
  }

  // Get admin info if not provided
  let adminInfo = adminUser
  if (!adminInfo) {
    adminInfo = await getCurrentAdminForLogging()
  }

  if (!adminInfo) {
    console.error('No admin user found for activity logging')
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('ticket_activity_logs')
    .insert({
      ticket_id: ticketId,
      admin_user_id: adminInfo.id,
      admin_email: adminInfo.email,
      action_type: actionType,
      action_details: actionDetails
    })
    .select()
    .single()

  if (error) {
    console.error('Error logging ticket activity:', error)
    return null
  }

  return data
}
