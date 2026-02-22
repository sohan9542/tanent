import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentStaffUser, getUserOrganizations } from '@/lib/staff-auth'
import { validateImageFile } from '@/lib/storage'
import { getCurrentAdminForLogging } from '@/lib/admin-activity-log'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/branding/logos/upload - Upload a branding logo file
 */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const logoType = formData.get('logo_type') // 'owner', 'technical_partner', 'warranty_partner'
    const organizationId = formData.get('organization_id') // Optional: for platform admins

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()
    const staffUser = await getCurrentStaffUser()

    let targetOrgId = organizationId

    // Determine target organization
    if (!targetOrgId) {
      if (staffUser) {
        // Organization user - get their organization
        const organizations = getUserOrganizations(staffUser)
        if (organizations.length === 0) {
          return NextResponse.json(
            { error: 'No organization found' },
            { status: 403 }
          )
        }
        targetOrgId = organizations[0].id

        // Check if user is org admin
        const isAdmin = organizations.some(org => {
          const membership = staffUser.memberships?.find(m => m.organization_id === org.id)
          return membership?.role === 'org_admin'
        })

        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only organization admins can upload logos' },
            { status: 403 }
          )
        }
      } else if (!platformUser && !legacyAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      // Platform admin can upload for any org (or null for global)
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!logoType || !['owner', 'technical_partner', 'warranty_partner'].includes(logoType)) {
      return NextResponse.json(
        { error: 'Invalid logo_type. Must be one of: owner, technical_partner, warranty_partner' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Generate filename: branding-{org_id or 'global'}-{logo_type}-{timestamp}.{ext}
    const extension = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const orgPrefix = targetOrgId ? targetOrgId.substring(0, 8) : 'global'
    const filename = `branding-${orgPrefix}-${logoType}-${timestamp}.${extension}`
    const filePath = `branding-logos/${filename}`

    // Get current logo URL before upload (to delete old file)
    let query = supabaseAdmin
      .from('branding_logos')
      .select('logo_url')
      .eq('logo_type', logoType)

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId)
    } else {
      query = query.is('organization_id', null)
    }

    const { data: currentLogo } = await query.single()

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ticket-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload logo: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ticket-images')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Delete old logo from storage if exists
    if (currentLogo?.logo_url) {
      try {
        const urlParts = currentLogo.logo_url.split('/storage/v1/object/public/ticket-images/')
        if (urlParts.length > 1) {
          const oldPath = urlParts[1]
          await supabaseAdmin.storage
            .from('ticket-images')
            .remove([oldPath])
        }
      } catch (err) {
        console.warn('Failed to delete old logo:', err)
      }
    }

    // Update or create logo entry
    const adminInfo = await getCurrentAdminForLogging()
    
    // Check if logo entry exists
    let checkQuery = supabaseAdmin
      .from('branding_logos')
      .select('id')
      .eq('logo_type', logoType)

    if (targetOrgId) {
      checkQuery = checkQuery.eq('organization_id', targetOrgId)
    } else {
      checkQuery = checkQuery.is('organization_id', null)
    }

    const { data: existingLogo } = await checkQuery.single()

    let updatedLogo
    if (existingLogo) {
      // Update existing
      const { data, error: updateError } = await supabaseAdmin
        .from('branding_logos')
        .update({
          logo_url: logoUrl,
          uploaded_by: adminInfo?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLogo.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      updatedLogo = data
    } else {
      // Create new
      const { data, error: insertError } = await supabaseAdmin
        .from('branding_logos')
        .insert({
          logo_type: logoType,
          logo_url: logoUrl,
          organization_id: targetOrgId || null,
          uploaded_by: adminInfo?.id || null
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      updatedLogo = data
    }

    return NextResponse.json({
      success: true,
      logoUrl: updatedLogo.logo_url,
      logoType: updatedLogo.logo_type,
      organization_id: updatedLogo.organization_id
    })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'An error occurred: ' + error.message },
      { status: 500 }
    )
  }
}
