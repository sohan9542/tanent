import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { parseTenantFile, normalizeRow } from '@/utils/excel-parser'
import { hashLastName } from '@/lib/auth/verify'
import { validateTenant } from '@/utils/validation'
import { requireAdminAuth } from '@/lib/middleware-admin'

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
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Parse file
    const rows = await parseTenantFile(file)
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty or invalid' },
        { status: 400 }
      )
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: []
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Normalize row data
        const normalized = normalizeRow(row)

        // Validate required fields
        const validation = validateTenant({
          tenantId: normalized.tenantId,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          email: normalized.email
        })

        if (!validation.isValid) {
          results.errors.push({
            row: rowNumber,
            error: validation.errors.join(', ')
          })
          continue
        }

        // Hash last name
        const lastNameHash = await hashLastName(normalized.lastName.trim())

        // Check if tenant_id already exists (must be unique)
        const { data: existing } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('tenant_id', normalized.tenantId.trim())
          .single()

        if (existing) {
          // Reject duplicate tenant IDs
          results.errors.push({
            row: rowNumber,
            error: `Tenant ID "${normalized.tenantId.trim()}" already exists. Tenant IDs must be unique.`
          })
          continue
        }

        // Parse dates (handle empty strings as null)
        const contractStart = normalized.contractStartDate && normalized.contractStartDate.trim() ? normalized.contractStartDate.trim() : null
        const contractEnd = normalized.contractEndDate && normalized.contractEndDate.trim() ? normalized.contractEndDate.trim() : null

        const tenantData = {
          tenant_id: normalized.tenantId.trim(),
          first_name: normalized.firstName.trim(),
          last_name: normalized.lastName.trim(),
          last_name_hash: lastNameHash,
          email: normalized.email?.trim() || null,
          phone: normalized.phone?.trim() || null,
          building_name: normalized.buildingName?.trim() || null,
          unit_number: normalized.unitNumber?.trim() || null,
          contract_start_date: contractStart || null,
          contract_end_date: contractEnd || null,
          floor: normalized.floor?.trim() || null,
          additional_notes: normalized.additionalNotes?.trim() || null,
          is_active: true
        }

        // Insert new tenant
        const { error } = await supabaseAdmin
          .from('tenants')
          .insert(tenantData)

        if (error) {
          // Handle unique constraint violation from database
          if (error.code === '23505') {
            results.errors.push({
              row: rowNumber,
              error: `Tenant ID "${normalized.tenantId.trim()}" already exists. Tenant IDs must be unique.`
            })
            continue
          }
          throw error
        }
        results.imported++
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch (error) {
    console.error('Import tenants error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An error occurred during import' 
      },
      { status: 500 }
    )
  }
}


