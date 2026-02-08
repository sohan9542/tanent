import { NextResponse } from 'next/server'
import { getCurrentStaffUser, isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/craftsmen - List craftsmen for user's organization
 * Optional query param: ?object_id=xxx to filter by object assignment
 */
export async function GET(request) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      )
    }

    const orgIds = organizations.map(o => o.id)
    const { searchParams } = new URL(request.url)
    const objectId = searchParams.get('object_id')

    let query = supabaseAdmin
      .from('craftsmen')
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .in('organization_id', orgIds)
      .order('name')

    // If object_id is provided, filter to craftsmen assigned to that object
    if (objectId) {
      const { data: objectCraftsmen } = await supabaseAdmin
        .from('object_craftsmen')
        .select('craftsman_id')
        .eq('object_id', objectId)
      
      const craftsmenIds = (objectCraftsmen || []).map(oc => oc.craftsman_id)
      
      if (craftsmenIds.length === 0) {
        return NextResponse.json({ craftsmen: [] })
      }
      
      query = query.in('id', craftsmenIds)
    }

    const { data: craftsmen, error } = await query

    if (error) {
      console.error('Error fetching craftsmen:', error)
      throw error
    }

    return NextResponse.json({
      craftsmen: craftsmen || []
    })
  } catch (error) {
    console.error('Get craftsmen error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/org/craftsmen - Create a new craftsman
 * Only org admins can create craftsmen
 * Organization must be assigned as TECHNICAL on at least one object
 */
export async function POST(request) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization admins can create craftsmen' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone, email, trade, notes } = body

    if (!name || !trade) {
      return NextResponse.json(
        { error: 'Name and trade are required' },
        { status: 400 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      )
    }

    // Use the primary organization
    const organizationId = organizations[0].id

    // Verify organization is assigned as TECHNICAL on at least one object
    const { data: techAssignments } = await supabaseAdmin
      .from('object_assignments')
      .select('id')
      .eq('tech_org_id', organizationId)
      .limit(1)

    if (!techAssignments || techAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Organization must be assigned as TECHNICAL on at least one object to manage craftsmen' },
        { status: 403 }
      )
    }

    // Create the craftsman
    const { data: craftsman, error } = await supabaseAdmin
      .from('craftsmen')
      .insert({
        organization_id: organizationId,
        name,
        phone: phone || null,
        email: email || null,
        trade,
        notes: notes || null,
        is_active: true
      })
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating craftsman:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      craftsman
    }, { status: 201 })
  } catch (error) {
    console.error('Create craftsman error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
