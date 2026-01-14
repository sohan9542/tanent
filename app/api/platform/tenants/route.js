import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashLastName } from '@/lib/auth/verify'
import { validateTenant } from '@/utils/validation'
import { requirePlatformAdmin } from '@/lib/platform-auth'

export async function GET(request) {
  try {
    await requirePlatformAdmin()
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const objectId = searchParams.get('object_id') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('tenants')
      .select(`
        *,
        object:objects(id, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (objectId) {
      query = query.eq('object_id', objectId)
    }

    if (search) {
      query = query.or(`tenant_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: tenants, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      tenants: tenants || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Tenants list error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    await requirePlatformAdmin()
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { tenantId, firstName, lastName, email, phone, objectId, unitNumber } = body

    // Validate
    const validation = validateTenant({ tenantId, firstName, lastName, email })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // Validate object_id is provided
    if (!objectId) {
      return NextResponse.json(
        { success: false, error: 'Object (building) is required' },
        { status: 400 }
      )
    }

    // Verify object exists
    const { data: object } = await supabaseAdmin
      .from('objects')
      .select('id')
      .eq('id', objectId)
      .single()

    if (!object) {
      return NextResponse.json(
        { success: false, error: 'Invalid object selected' },
        { status: 400 }
      )
    }

    // Hash last name
    const lastNameHash = await hashLastName(lastName.trim())

    // Check if tenant_id already exists
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('tenant_id', tenantId.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID already exists' },
        { status: 400 }
      )
    }

    // Create tenant
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        tenant_id: tenantId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        last_name_hash: lastNameHash,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        object_id: objectId,
        unit_number: unitNumber?.trim() || null,
        is_active: true
      })
      .select(`
        *,
        object:objects(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        tenantId: tenant.tenant_id,
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
        objectId: tenant.object_id,
        object: tenant.object,
        unitNumber: tenant.unit_number,
        isActive: tenant.is_active,
        createdAt: tenant.created_at
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Tenant ID already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
