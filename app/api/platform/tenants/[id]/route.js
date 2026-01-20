import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashLastName } from '@/lib/auth/verify'
import { validateTenant } from '@/utils/validation'
import { requirePlatformAdmin } from '@/lib/platform-auth'

export async function GET(request, { params }) {
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
    const resolvedParams = await params
    const { id } = resolvedParams

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        object:objects(id, name)
      `)
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
      objectId: tenant.object_id,
      object: tenant.object,
      unitNumber: tenant.unit_number,
      contractStartDate: tenant.contract_start_date,
      contractEndDate: tenant.contract_end_date,
      floor: tenant.floor,
      additionalNotes: tenant.additional_notes,
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
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const { 
      tenantId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      objectId, 
      unitNumber, 
      contractStartDate,
      contractEndDate,
      floor,
      additionalNotes,
      isActive 
    } = body

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

    // Get existing tenant to check if last name changed
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('last_name, tenant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Parse dates (handle empty strings as null)
    const contractStart = contractStartDate && contractStartDate.trim() ? contractStartDate.trim() : null
    const contractEnd = contractEndDate && contractEndDate.trim() ? contractEndDate.trim() : null

    // Prepare update data
    const updateData = {
      tenant_id: tenantId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      object_id: objectId,
      unit_number: unitNumber?.trim() || null,
      contract_start_date: contractStart || null,
      contract_end_date: contractEnd || null,
      floor: floor?.trim() || null,
      additional_notes: additionalNotes?.trim() || null,
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
        contractStartDate: tenant.contract_start_date,
        contractEndDate: tenant.contract_end_date,
        floor: tenant.floor,
        additionalNotes: tenant.additional_notes,
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
    const resolvedParams = await params
    const { id } = resolvedParams

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
