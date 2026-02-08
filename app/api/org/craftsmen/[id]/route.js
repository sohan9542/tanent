import { NextResponse } from 'next/server'
import { getCurrentStaffUser, isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/craftsmen/[id] - Get a specific craftsman
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
    const { id } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Get craftsman with organization check
    const { data: craftsman, error } = await supabaseAdmin
      .from('craftsmen')
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .eq('id', id)
      .in('organization_id', orgIds)
      .single()

    if (error || !craftsman) {
      return NextResponse.json(
        { error: 'Craftsman not found' },
        { status: 404 }
      )
    }

    // Get object assignments for this craftsman
    const { data: objectAssignments } = await supabaseAdmin
      .from('object_craftsmen')
      .select(`
        id,
        object_id,
        object:objects(id, name, address),
        created_at
      `)
      .eq('craftsman_id', id)

    return NextResponse.json({
      craftsman,
      objectAssignments: objectAssignments || []
    })
  } catch (error) {
    console.error('Get craftsman error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/org/craftsmen/[id] - Update a craftsman
 * Only org admins can update
 */
export async function PATCH(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization admins can update craftsmen' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { name, phone, email, trade, notes, is_active } = body

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Verify craftsman exists and belongs to user's organization
    const { data: existingCraftsman } = await supabaseAdmin
      .from('craftsmen')
      .select('id, organization_id')
      .eq('id', id)
      .in('organization_id', orgIds)
      .single()

    if (!existingCraftsman) {
      return NextResponse.json(
        { error: 'Craftsman not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (trade !== undefined) updateData.trade = trade
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      )
    }

    // Validate required fields if provided
    if (updateData.name !== undefined && !updateData.name) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }
    if (updateData.trade !== undefined && !updateData.trade) {
      return NextResponse.json(
        { error: 'Trade cannot be empty' },
        { status: 400 }
      )
    }

    const { data: craftsman, error } = await supabaseAdmin
      .from('craftsmen')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating craftsman:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      craftsman
    })
  } catch (error) {
    console.error('Update craftsman error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/org/craftsmen/[id] - Soft delete a craftsman
 * Sets is_active = false (soft delete)
 * Only org admins can delete
 */
export async function DELETE(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization admins can delete craftsmen' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Verify craftsman exists and belongs to user's organization
    const { data: existingCraftsman } = await supabaseAdmin
      .from('craftsmen')
      .select('id, organization_id')
      .eq('id', id)
      .in('organization_id', orgIds)
      .single()

    if (!existingCraftsman) {
      return NextResponse.json(
        { error: 'Craftsman not found' },
        { status: 404 }
      )
    }

    // Soft delete - set is_active to false
    const { error } = await supabaseAdmin
      .from('craftsmen')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting craftsman:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Craftsman deactivated successfully'
    })
  } catch (error) {
    console.error('Delete craftsman error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
