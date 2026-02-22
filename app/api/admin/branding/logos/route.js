import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentStaffUser, getUserOrganizations } from '@/lib/staff-auth'
import { getCurrentAdminForLogging } from '@/lib/admin-activity-log'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/branding/logos - Get branding logos for current organization
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') // Optional: for platform admins to view specific org

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()
    const staffUser = await getCurrentStaffUser()

    let targetOrgId = organizationId

    // If no organization_id provided, use user's organization
    if (!targetOrgId) {
      if (staffUser) {
        // Organization user - get their organization
        const organizations = getUserOrganizations(staffUser)
        if (organizations.length > 0) {
          targetOrgId = organizations[0].id
        } else {
          return NextResponse.json(
            { error: 'No organization found' },
            { status: 403 }
          )
        }
      } else if (!platformUser && !legacyAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      // Platform admin can view any org or global (null org_id)
    }

    // Build query
    let query = supabaseAdmin
      .from('branding_logos')
      .select('*')
      .order('logo_type', { ascending: true })

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId)
    } else {
      // Platform admin viewing global logos (null organization_id)
      query = query.is('organization_id', null)
    }

    const { data: logos, error } = await query

    if (error) {
      console.error('Error fetching logos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch logos' },
        { status: 500 }
      )
    }

    // Ensure we have entries for all 3 types (create if missing)
    const logoMap = {}
    if (logos) {
      logos.forEach(logo => {
        logoMap[logo.logo_type] = logo.logo_url || ''
      })
    }

    // Return structured data
    return NextResponse.json({
      logos: logos || [],
      logoMap: {
        owner: logoMap.owner || '',
        technical_partner: logoMap.technical_partner || '',
        warranty_partner: logoMap.warranty_partner || ''
      },
      organization_id: targetOrgId
    })
  } catch (error) {
    console.error('Get logos error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
