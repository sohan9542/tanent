import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateImageFile, uploadImage, MAX_FILES } from '@/lib/storage'

/**
 * GET /api/pre-tickets - Get pre-tickets for current tenant
 */
export async function GET(request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // draft, in_review, finalized

    let query = supabaseAdmin
      .from('pre_tickets')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: preTickets, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      preTickets: preTickets || []
    })
  } catch (error) {
    console.error('Get pre-tickets error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pre-tickets - Create a new pre-ticket
 */
export async function POST(request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const category = formData.get('category')
    const locationDetails = formData.get('locationDetails') || ''
    const description = formData.get('description')
    const urgency = formData.get('urgency')
    const buildingId = formData.get('buildingId') || null
    const aiFollowups = formData.get('aiFollowups') // JSON string
    const aiAnswers = formData.get('aiAnswers') // JSON string

    // Validate required fields
    if (!category || !description || !urgency) {
      return NextResponse.json(
        { error: 'Category, description, and urgency are required' },
        { status: 400 }
      )
    }

    if (!['plumbing', 'electrical', 'heating', 'other'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    if (!['low', 'medium', 'high'].includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency level' },
        { status: 400 }
      )
    }

    // Handle image uploads
    const imageFiles = []
    const uploadedImages = []

    // Collect all image files
    for (let i = 0; i < MAX_FILES; i++) {
      const file = formData.get(`image${i}`)
      if (file && file instanceof File) {
        imageFiles.push(file)
      }
    }

    // Validate and upload images
    if (imageFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} images allowed` },
        { status: 400 }
      )
    }

    for (const file of imageFiles) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      const uploadResult = await uploadImage(file, 'pre-tickets', file.name)
      if (uploadResult.error) {
        return NextResponse.json(
          { error: `Failed to upload image: ${uploadResult.error}` },
          { status: 500 }
        )
      }

      uploadedImages.push({
        url: uploadResult.url,
        filename: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString()
      })
    }

    // Parse AI data
    let aiFollowupsArray = []
    let aiAnswersObj = {}

    try {
      if (aiFollowups) {
        aiFollowupsArray = JSON.parse(aiFollowups)
      }
      if (aiAnswers) {
        aiAnswersObj = JSON.parse(aiAnswers)
      }
    } catch (parseError) {
      console.error('Failed to parse AI data:', parseError)
    }

    // Get tenant's object_id (or building_id for backward compatibility)
    let finalObjectId = buildingId
    if (!finalObjectId && tenant.object_id) {
      finalObjectId = tenant.object_id
    } else if (!finalObjectId && tenant.building_id) {
      finalObjectId = tenant.building_id
    }

    // Create pre-ticket
    const { data: preTicket, error } = await supabaseAdmin
      .from('pre_tickets')
      .insert({
        tenant_id: tenant.id,
        object_id: finalObjectId,
        building_id: finalObjectId, // Keep for backward compatibility
        category: category,
        location_details: locationDetails.trim() || null,
        description: description.trim(),
        urgency: urgency,
        status: 'draft',
        images: uploadedImages,
        ai_followups: aiFollowupsArray,
        ai_answers: aiAnswersObj
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      preTicket: preTicket
    }, { status: 201 })
  } catch (error) {
    console.error('Create pre-ticket error:', error)
    return NextResponse.json(
      { error: 'An error occurred while creating the pre-ticket' },
      { status: 500 }
    )
  }
}
