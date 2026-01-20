import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/platform/objects - List all objects
 */
export async function GET() {
  try {
    await requirePlatformAdmin()

    const { data: objects, error } = await supabaseAdmin
      .from('objects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const objectIds = (objects || []).map((obj) => obj.id)
    let assignmentMap = new Map()

    if (objectIds.length > 0) {
      const { data: assignments, error: assignmentError } = await supabaseAdmin
        .from('object_assignments')
        .select(`
          *,
          owner_org:organizations!object_assignments_owner_org_id_fkey(id, name),
          tech_org:organizations!object_assignments_tech_org_id_fkey(id, name),
          warranty_org:organizations!object_assignments_warranty_org_id_fkey(id, name)
        `)
        .in('object_id', objectIds)

      if (assignmentError) {
        console.error('Error fetching object assignments:', assignmentError)
      } else {
        assignmentMap = new Map((assignments || []).map((assignment) => [assignment.object_id, assignment]))
      }
    }

    const result = (objects || []).map((obj) => ({
      ...obj,
      assignment: assignmentMap.has(obj.id) ? [assignmentMap.get(obj.id)] : []
    }))

    return NextResponse.json({
      objects: result
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get objects error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platform/objects - Create new object
 */
export async function POST(request) {
  try {
    await requirePlatformAdmin()

    const body = await request.json()
    const { object_id, name, street, zip, city, address } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Object name is required' },
        { status: 400 }
      )
    }

    // Check if object_id is unique if provided
    if (object_id) {
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('objects')
        .select('id')
        .eq('object_id', object_id.trim())
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Object ID already exists' },
          { status: 400 }
        )
      }
    }

    const { data: object, error } = await supabaseAdmin
      .from('objects')
      .insert({
        object_id: object_id?.trim() || null,
        name: name.trim(),
        street: street?.trim() || null,
        zip: zip?.trim() || null,
        city: city?.trim() || null,
        address: address?.trim() || null
      })
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Object ID already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    // Create empty object_assignment
    await supabaseAdmin
      .from('object_assignments')
      .insert({
        object_id: object.id
      })

    return NextResponse.json({
      success: true,
      object
    }, { status: 201 })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Create object error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
