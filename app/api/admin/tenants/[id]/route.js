import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashLastName } from '@/lib/auth/verify'
import { validateTenant } from '@/utils/validation'
import { requireAdminAuth } from '@/lib/middleware-admin'

export async function GET(request, { params }) {
  // Require admin authentication
  const admin = await requireAdminAuth()
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  try {
    const { id } = params

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: tenant.id,
      tenantId: tenant.tenant_id,
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      email: tenant.email,
      phone: tenant.phone,
      buildingName: tenant.building_name,
      unitNumber: tenant.unit_number,
      isActive: tenant.is_active,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  // Require admin authentication
  const admin = await requireAdminAuth()
  
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = params
    const body = await request.json()
    const { tenantId, firstName, lastName, email, phone, buildingName, unitNumber, isActive } = body

    // Validate
    const validation = validateTenant({ tenantId, firstName, lastName, email })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // Get existing tenant to check if last name changed
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('last_name')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData = {
      tenant_id: tenantId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      building_name: buildingName?.trim() || null,
      unit_number: unitNumber?.trim() || null,
      is_active: isActive !== undefined ? isActive : true
    }

    // Re-hash last name if it changed
    if (existing.last_name !== lastName.trim()) {
      updateData.last_name_hash = await hashLastName(lastName.trim())
    }

    // Check if tenant_id conflicts (if changed)
    if (tenantId.trim() !== existing.tenant_id) {
      const { data: conflict } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('tenant_id', tenantId.trim())
        .neq('id', id)
        .single()

      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Tenant ID already exists' },
          { status: 400 }
        )
      }
    }

    // Update tenant
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', id)
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
        isActive: tenant.is_active,
        updatedAt: tenant.updated_at
      }
    })
  } catch (error) {
    console.error('Update tenant error:', error)
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

export async function DELETE(request, { params }) {
  // Require admin authentication
  const admin = await requireAdminAuth()
  
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = params

    // Delete tenant sessions first (cascade delete)
    await supabaseAdmin
      .from('tenant_sessions')
      .delete()
      .eq('tenant_id', id)

    // Delete tenant tickets if they exist (cascade delete)
    await supabaseAdmin
      .from('tickets')
      .delete()
      .eq('tenant_id', id)

    // Hard delete the tenant
    const { error } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete tenant error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the tenant' },
      { status: 500 }
    )
  }
}


