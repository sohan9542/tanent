import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { getProject } from '@/lib/integrations/capmo/client'

export async function GET(request, { params }) {
  try {
    await requirePlatformAdmin()
    const resolvedParams = await params
    const { id } = resolvedParams
    const project = await getProject(id)
    return NextResponse.json({ success: true, project })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Capmo get project error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Capmo project' },
      { status: 500 }
    )
  }
}
