import { supabaseAdmin } from './supabase/server'

/**
 * Get accessible object IDs for a user based on their object roles
 * Returns array of object IDs the user can access
 */
export async function getAccessibleObjectIds(userId) {
  try {
    // Get all object_roles for this user
    const { data: objectRoles, error } = await supabaseAdmin
      .from('object_roles')
      .select(`
        object_id,
        organization_id,
        role_type,
        category_scope
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching object roles:', error)
      return []
    }

    if (!objectRoles || objectRoles.length === 0) {
      return []
    }

    // Get object assignments for these objects
    const objectIds = objectRoles.map(r => r.object_id)
    if (objectIds.length === 0) {
      return []
    }

    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .in('object_id', objectIds)

    if (assignError) {
      console.error('Error fetching assignments:', assignError)
      return []
    }

    // Create map of object_id -> assignment
    const assignmentMap = new Map()
    assignments?.forEach(a => assignmentMap.set(a.object_id, a))

    // Filter: object_role.organization_id must match assignment for that role_type
    const accessibleObjectIds = new Set()

    for (const objRole of objectRoles) {
      const assignment = assignmentMap.get(objRole.object_id)
      if (!assignment) continue

      let orgMatches = false

      // Check if organization_id matches the assignment for this role_type
      if (objRole.role_type === 'owner' && assignment.owner_org_id === objRole.organization_id) {
        orgMatches = true
      } else if (objRole.role_type === 'technical' && assignment.tech_org_id === objRole.organization_id) {
        orgMatches = true
      } else if (objRole.role_type === 'warranty' && assignment.warranty_org_id === objRole.organization_id) {
        orgMatches = true
      }

      if (orgMatches) {
        accessibleObjectIds.add(objRole.object_id)
      }
    }

    return Array.from(accessibleObjectIds)
  } catch (error) {
    console.error('Error getting accessible objects:', error)
    return []
  }
}

/**
 * Check if user can access a specific ticket
 * Returns true if user has object_role on the ticket's object
 * AND organization matches assignment
 */
export async function canAccessTicket(userId, ticket) {
  if (!ticket || !ticket.object_id) {
    return false
  }

  try {
    // Get user's object_role for this object
    const { data: objectRoles, error } = await supabaseAdmin
      .from('object_roles')
      .select('organization_id, role_type, category_scope')
      .eq('user_id', userId)
      .eq('object_id', ticket.object_id)

    if (error || !objectRoles || objectRoles.length === 0) {
      return false
    }

    // Get object assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('object_assignments')
      .select('owner_org_id, tech_org_id, warranty_org_id')
      .eq('object_id', ticket.object_id)
      .single()

    if (assignError || !assignment) {
      return false
    }

    if (error || !objectRoles || objectRoles.length === 0) {
      return false
    }

    // Check if any object_role matches the assignment
    for (const objRole of objectRoles) {
      let orgMatches = false

      // Check organization match
      if (objRole.role_type === 'owner' && assignment.owner_org_id === objRole.organization_id) {
        orgMatches = true
      } else if (objRole.role_type === 'technical' && assignment.tech_org_id === objRole.organization_id) {
        orgMatches = true
      } else if (objRole.role_type === 'warranty' && assignment.warranty_org_id === objRole.organization_id) {
        orgMatches = true
      }

      if (orgMatches) {
        // If warranty with category_scope, check ticket category
        if (objRole.role_type === 'warranty' && objRole.category_scope) {
          if (ticket.category === objRole.category_scope) {
            return true
          }
        } else {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('Error checking ticket access:', error)
    return false
  }
}

/**
 * Get user's organization memberships
 */
export async function getUserOrganizations(userId) {
  try {
    const { data: memberships, error } = await supabaseAdmin
      .from('organization_memberships')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching organization memberships:', error)
      return []
    }

    return memberships || []
  } catch (error) {
    console.error('Error getting user organizations:', error)
    return []
  }
}

/**
 * Check if user is admin in any organization
 */
export async function isOrganizationAdmin(userId) {
  const memberships = await getUserOrganizations(userId)
  return memberships.some(m => m.role === 'org_admin')
}

/**
 * Get objects where user's organization is assigned
 */
export async function getObjectsForOrganization(organizationId) {
  try {
    // Get assignments where org is owner, tech, or warranty
    const { data: assignments, error } = await supabaseAdmin
      .from('object_assignments')
      .select('*, object:objects(*)')
      .or(`owner_org_id.eq.${organizationId},tech_org_id.eq.${organizationId},warranty_org_id.eq.${organizationId}`)

    if (error) {
      console.error('Error fetching objects for organization:', error)
      return []
    }

    return assignments || []
  } catch (error) {
    console.error('Error getting objects for organization:', error)
    return []
  }
}
