import { supabaseAdmin } from '../supabase/server'
import bcrypt from 'bcryptjs'

/**
 * Verify tenant credentials (Tenant ID + Last Name)
 */
export async function verifyTenantCredentials(tenantId, lastName) {
  // Lookup tenant by tenant_id
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (error || !tenant) {
    return null
  }

  // Verify last name hash
  const isValid = await bcrypt.compare(lastName, tenant.last_name_hash)
  
  if (!isValid) {
    return null
  }

  return tenant
}

/**
 * Hash last name for storage
 */
export async function hashLastName(lastName) {
  const saltRounds = 10
  return await bcrypt.hash(lastName, saltRounds)
}


