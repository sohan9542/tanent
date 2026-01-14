import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, getAccessibleBuildings } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getAccessibleObjectIds } from '@/lib/object-auth'

/**
 * GET /api/admin/tickets - Get tickets with object-based role filtering
 */
export async function GET(request) {
  try {
    // Check platform admin first (has access to all tickets)
    const platformUser = await getCurrentPlatformUser()
    const isPlatformAdmin = platformUser?.role === 'platform_admin'
    
    // Check organization user
    const staffUser = await getCurrentStaffUser()
    
    // Legacy admin check (for backward compatibility)
    const legacyAdmin = await requireAdminAuth()

    if (!platformUser && !staffUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const urgency = searchParams.get('urgency')
    const objectId = searchParams.get('objectId') // Renamed from buildingId
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        tenant:tenants(id, tenant_id, first_name, last_name, building_name, unit_number),
        object:objects(id, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If organization user (not platform admin), filter by accessible objects
    if (staffUser && !isPlatformAdmin) {
      const accessibleObjectIds = await getAccessibleObjectIds(staffUser.id)
      
      if (accessibleObjectIds.length === 0) {
        // No accessible objects, return empty
        return NextResponse.json({
          tickets: [],
          total: 0,
          page,
          limit
        })
      }

      // Filter by accessible object IDs
      // Support both object_id (new) and building_id (old) during migration
      if (accessibleObjectIds.length > 0) {
        query = query.or(`object_id.in.(${accessibleObjectIds.join(',')}),building_id.in.(${accessibleObjectIds.join(',')})`)
      }
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (urgency) {
      query = query.eq('urgency', urgency)
    }
    if (objectId) {
      query = query.or(`object_id.eq.${objectId},building_id.eq.${objectId}`)
    }

    const { data: tickets, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      tickets: tickets || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Get tickets error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
