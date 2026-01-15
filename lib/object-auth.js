import { supabaseAdmin } from './supabase/server'

/**
 * Get accessible object IDs for a user based on their object roles
 * Returns array of object IDs the user can access
 */
export async function getAccessibleObjectIds(userId) {
  try {
    const accessibleObjectIds = new Set()

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
    }

    // Get organization memberships for this user
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId)

    if (membershipError) {
      console.error('Error fetching organization memberships:', membershipError)
    }

    const orgIds = (memberships || []).map((membership) => membership.organization_id)

    // Handle object_roles-based access
    if (objectRoles && objectRoles.length > 0) {
      const objectIds = objectRoles.map(r => r.object_id).filter(Boolean)
      if (objectIds.length > 0) {
        const { data: assignments, error: assignError } = await supabaseAdmin
          .from('object_assignments')
          .select('*')
          .in('object_id', objectIds)

        if (assignError) {
          console.error('Error fetching assignments:', assignError)
        } else {
          const assignmentMap = new Map()
          assignments?.forEach(a => assignmentMap.set(a.object_id, a))

          for (const objRole of objectRoles) {
            const assignment = assignmentMap.get(objRole.object_id)
            if (!assignment) continue

            let orgMatches = false
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
        }
      }
    }

    // Handle organization membership-based access
    if (orgIds.length > 0) {
      const orgIdList = orgIds.join(',')
      const { data: orgAssignments, error: orgAssignError } = await supabaseAdmin
        .from('object_assignments')
        .select('object_id')
        .or(`owner_org_id.in.(${orgIdList}),tech_org_id.in.(${orgIdList}),warranty_org_id.in.(${orgIdList})`)

      if (orgAssignError) {
        console.error('Error fetching organization assignments:', orgAssignError)
      } else {
        orgAssignments?.forEach((assignment) => {
          if (assignment.object_id) {
            accessibleObjectIds.add(assignment.object_id)
          }
        })
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
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('object_assignments')
      .select('owner_org_id, tech_org_id, warranty_org_id')
      .eq('object_id', ticket.object_id)
      .single()

    if (assignError || !assignment) {
      return false
    }

    const { data: objectRoles, error } = await supabaseAdmin
      .from('object_roles')
      .select('organization_id, role_type, category_scope')
      .eq('user_id', userId)
      .eq('object_id', ticket.object_id)

    if (!error && objectRoles && objectRoles.length > 0) {
      for (const objRole of objectRoles) {
        let orgMatches = false

        if (objRole.role_type === 'owner' && assignment.owner_org_id === objRole.organization_id) {
          orgMatches = true
        } else if (objRole.role_type === 'technical' && assignment.tech_org_id === objRole.organization_id) {
          orgMatches = true
        } else if (objRole.role_type === 'warranty' && assignment.warranty_org_id === objRole.organization_id) {
          orgMatches = true
        }

        if (orgMatches) {
          if (objRole.role_type === 'warranty' && objRole.category_scope) {
            if (ticket.category === objRole.category_scope) {
              return true
            }
          } else {
            return true
          }
        }
      }
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId)

    if (membershipError || !memberships || memberships.length === 0) {
      return false
    }

    return memberships.some((membership) => (
      membership.organization_id === assignment.owner_org_id
      || membership.organization_id === assignment.tech_org_id
      || membership.organization_id === assignment.warranty_org_id
    ))
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
