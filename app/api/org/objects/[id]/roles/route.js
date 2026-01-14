import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/objects/[id]/roles - Get object roles for this org
 */
export async function GET(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Verify org has access to this object
    const { data: assignment } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', id)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    const orgIsAssigned = 
      orgIds.includes(assignment.owner_org_id) ||
      orgIds.includes(assignment.tech_org_id) ||
      orgIds.includes(assignment.warranty_org_id)

    if (!orgIsAssigned) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get object roles for users in this organization
    const { data: roles, error } = await supabaseAdmin
      .from('object_roles')
      .select(`
        *,
        user:platform_users(id, name, email)
      `)
      .eq('object_id', id)
      .in('organization_id', orgIds)

    if (error) {
      throw error
    }

    return NextResponse.json({
      roles: roles || []
    })
  } catch (error) {
    console.error('Get roles error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/org/objects/[id]/roles - Create object role
 */
export async function POST(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { user_id, role_type, category_scope } = body

    if (!user_id || !role_type) {
      return NextResponse.json(
        { error: 'user_id and role_type are required' },
        { status: 400 }
      )
    }

    if (!['owner', 'technical', 'warranty'].includes(role_type)) {
      return NextResponse.json(
        { error: 'Invalid role_type' },
        { status: 400 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Verify org has access to this object
    const { data: assignment } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', id)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Determine which organization_id to use based on role_type
    let organizationId = null
    if (role_type === 'owner' && assignment.owner_org_id) {
      organizationId = assignment.owner_org_id
    } else if (role_type === 'technical' && assignment.tech_org_id) {
      organizationId = assignment.tech_org_id
    } else if (role_type === 'warranty' && assignment.warranty_org_id) {
      organizationId = assignment.warranty_org_id
    }

    if (!organizationId || !orgIds.includes(organizationId)) {
      return NextResponse.json(
        { error: 'Organization is not assigned as ' + role_type + ' for this object' },
        { status: 400 }
      )
    }

    // Verify user is in the organization
    const { data: membership } = await supabaseAdmin
      .from('organization_memberships')
      .select('*')
      .eq('user_id', user_id)
      .eq('organization_id', organizationId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not in this organization' },
        { status: 400 }
      )
    }

    // Create object role
    const { data: objectRole, error } = await supabaseAdmin
      .from('object_roles')
      .insert({
        user_id,
        object_id: id,
        organization_id: organizationId,
        role_type,
        category_scope: category_scope || null
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'User already has this role on this object' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      role: objectRole
    }, { status: 201 })
  } catch (error) {
    console.error('Create role error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
