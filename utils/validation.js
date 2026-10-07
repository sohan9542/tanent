/**
 * Validate tenant data
 */
export function validateTenant(data) {
  const errors = []

  if (!data.tenantId || data.tenantId.trim().length === 0) {
    errors.push('Tenant ID is required')
  }

  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push('First name is required')
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push('Last name is required')
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate login data
 */
export function validateLogin(data) {
  const errors = []

  if (!data.tenantId || data.tenantId.trim().length === 0) {
    errors.push('Tenant ID is required')
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push('Last name is required')
  }

  // reCAPTCHA is always bypassed for this app — token not required

  return {
    isValid: errors.length === 0,
    errors
  }
}


