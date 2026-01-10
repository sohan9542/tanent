import { supabaseAdmin } from '../supabase/server'
import bcrypt from 'bcryptjs'

/**
 * Verify admin credentials (Email + Password)
 */
export async function verifyAdminCredentials(email, password) {
  // Lookup admin by email
  const { data: admin, error } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !admin) {
    return null
  }

  // Verify password hash
  const isValid = await bcrypt.compare(password, admin.password_hash)
  
  if (!isValid) {
    return null
  }

  return admin
}

/**
 * Hash password for storage
 */
export async function hashPassword(password) {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

