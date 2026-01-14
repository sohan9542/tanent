import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/platform/objects/[id]/assignments - Get object assignment
 */
export async function GET(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams

    const { data: assignment, error } = await supabaseAdmin
      .from('object_assignments')
      .select(`
        *,
        owner_org:organizations!object_assignments_owner_org_id_fkey(id, name),
        tech_org:organizations!object_assignments_tech_org_id_fkey(id, name),
        warranty_org:organizations!object_assignments_warranty_org_id_fkey(id, name)
      `)
      .eq('object_id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({
      assignment: assignment || null
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get assignment error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/platform/objects/[id]/assignments - Update object assignment
 */
export async function PUT(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { owner_org_id, tech_org_id, warranty_org_id } = body

    // Verify object exists
    const { data: object, error: objError } = await supabaseAdmin
      .from('objects')
      .select('id')
      .eq('id', id)
      .single()

    if (objError || !object) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Check if assignment exists
    const { data: existing } = await supabaseAdmin
      .from('object_assignments')
      .select('id')
      .eq('object_id', id)
      .single()

    let assignment
    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('object_assignments')
        .update({
          owner_org_id: owner_org_id || null,
          tech_org_id: tech_org_id || null,
          warranty_org_id: warranty_org_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('object_id', id)
        .select()
        .single()

      if (error) {
        throw error
      }
      assignment = data
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('object_assignments')
        .insert({
          object_id: id,
          owner_org_id: owner_org_id || null,
          tech_org_id: tech_org_id || null,
          warranty_org_id: warranty_org_id || null
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      assignment = data
    }

    return NextResponse.json({
      success: true,
      assignment
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Update assignment error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
