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
      .select(`
        *,
        assignment:object_assignments(
          owner_org:organizations!object_assignments_owner_org_id_fkey(id, name),
          tech_org:organizations!object_assignments_tech_org_id_fkey(id, name),
          warranty_org:organizations!object_assignments_warranty_org_id_fkey(id, name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      objects: objects || []
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
    const { name, address } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Object name is required' },
        { status: 400 }
      )
    }

    const { data: object, error } = await supabaseAdmin
      .from('objects')
      .insert({
        name: name.trim(),
        address: address?.trim() || null
      })
      .select()
      .single()

    if (error) {
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
