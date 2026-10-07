/** Static portfolio demo credentials — not stored in any database. */
export const DEMO_PLATFORM_ADMIN = {
  id: 'static-demo-platform-admin',
  email: 'demo@tanent.app',
  password: 'Demo123!',
  name: 'Demo Admin',
  role: 'platform_admin',
}

export const DEMO_TENANT = {
  id: 'static-demo-tenant',
  tenantId: 'DEMO-001',
  lastName: 'Demo',
  firstName: 'Demo',
  tenant_id: 'DEMO-001',
  first_name: 'Demo',
  last_name: 'Demo',
  is_active: true,
}

export function isDemoPlatformCredentials(email, password) {
  return (
    String(email || '').trim().toLowerCase() === DEMO_PLATFORM_ADMIN.email &&
    String(password || '') === DEMO_PLATFORM_ADMIN.password
  )
}

export function isDemoTenantCredentials(tenantId, lastName) {
  return (
    String(tenantId || '').trim().toUpperCase() === DEMO_TENANT.tenantId &&
    String(lastName || '').trim() === DEMO_TENANT.lastName
  )
}
