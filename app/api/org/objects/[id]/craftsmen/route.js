import { NextResponse } from 'next/server'
import { getCurrentStaffUser, isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/objects/[id]/craftsmen - Get craftsmen assigned to an object
 */
export async function GET(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id: objectId } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Verify org has access to this object
    const { data: assignment } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', objectId)
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

    // Get craftsmen assigned to this object
    const { data: objectCraftsmen, error } = await supabaseAdmin
      .from('object_craftsmen')
      .select(`
        id,
        created_at,
        craftsman:craftsmen(
          id,
          name,
          phone,
          email,
          trade,
          notes,
          is_active,
          organization:organizations(id, name)
        )
      `)
      .eq('object_id', objectId)

    if (error) {
      console.error('Error fetching object craftsmen:', error)
      throw error
    }

    // Check if user's org is the tech org (can manage craftsmen)
    const canManage = orgIds.includes(assignment.tech_org_id) && isOrganizationAdmin(staffUser)

    return NextResponse.json({
      objectCraftsmen: objectCraftsmen || [],
      canManage,
      techOrgId: assignment.tech_org_id
    })
  } catch (error) {
    console.error('Get object craftsmen error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/org/objects/[id]/craftsmen - Assign a craftsman to an object
 * Only org admins from the TECHNICAL organization can assign
 */
export async function POST(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization admins can assign craftsmen' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id: objectId } = resolvedParams
    const body = await request.json()
    const { craftsman_id } = body

    if (!craftsman_id) {
      return NextResponse.json(
        { error: 'craftsman_id is required' },
        { status: 400 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Get object assignment
    const { data: assignment } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', objectId)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Verify user's org is the TECHNICAL organization for this object
    if (!orgIds.includes(assignment.tech_org_id)) {
      return NextResponse.json(
        { error: 'Only the technical organization can assign craftsmen to this object' },
        { status: 403 }
      )
    }

    // Verify craftsman exists and belongs to user's organization
    const { data: craftsman } = await supabaseAdmin
      .from('craftsmen')
      .select('id, organization_id, is_active')
      .eq('id', craftsman_id)
      .in('organization_id', orgIds)
      .single()

    if (!craftsman) {
      return NextResponse.json(
        { error: 'Craftsman not found or not in your organization' },
        { status: 404 }
      )
    }

    if (!craftsman.is_active) {
      return NextResponse.json(
        { error: 'Cannot assign an inactive craftsman' },
        { status: 400 }
      )
    }

    // Create the assignment (trigger will validate org is tech_org)
    const { data: objectCraftsman, error } = await supabaseAdmin
      .from('object_craftsmen')
      .insert({
        object_id: objectId,
        craftsman_id
      })
      .select(`
        id,
        created_at,
        craftsman:craftsmen(
          id,
          name,
          phone,
          email,
          trade,
          organization:organizations(id, name)
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Craftsman is already assigned to this object' },
          { status: 400 }
        )
      }
      console.error('Error assigning craftsman:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      objectCraftsman
    }, { status: 201 })
  } catch (error) {
    console.error('Assign craftsman error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
