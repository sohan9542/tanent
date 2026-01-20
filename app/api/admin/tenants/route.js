import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashLastName } from '@/lib/auth/verify'
import { validateTenant } from '@/utils/validation'
import { requireAdminAuth } from '@/lib/middleware-admin'

export async function GET(request) {
  // Require admin authentication
  const admin = await requireAdminAuth()
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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
  // Require admin authentication
  const admin = await requireAdminAuth()
  
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { 
      tenantId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      buildingName, 
      unitNumber,
      contractStartDate,
      contractEndDate,
      floor,
      additionalNotes
    } = body

    // Validate
    const validation = validateTenant({ tenantId, firstName, lastName, email })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
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

    // Parse dates (handle empty strings as null)
    const contractStart = contractStartDate && contractStartDate.trim() ? contractStartDate.trim() : null
    const contractEnd = contractEndDate && contractEndDate.trim() ? contractEndDate.trim() : null

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
        building_name: buildingName?.trim() || null,
        unit_number: unitNumber?.trim() || null,
        contract_start_date: contractStart || null,
        contract_end_date: contractEnd || null,
        floor: floor?.trim() || null,
        additional_notes: additionalNotes?.trim() || null
      })
      .select()
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
        buildingName: tenant.building_name,
        unitNumber: tenant.unit_number,
        contractStartDate: tenant.contract_start_date,
        contractEndDate: tenant.contract_end_date,
        floor: tenant.floor,
        additionalNotes: tenant.additional_notes,
        isActive: tenant.is_active,
        createdAt: tenant.created_at
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    if (error.code === '23505') { // Unique constraint violation
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


