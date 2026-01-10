import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'

export async function GET(request) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      unitNumber: tenant.unit_number
    })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}


