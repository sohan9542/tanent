import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { listProjects } from '@/lib/integrations/capmo/client'

export async function GET() {
  try {
    await requirePlatformAdmin()
    const result = await listProjects()
    const projects = result?.data || result?.projects || result || []
    return NextResponse.json({ success: true, projects })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Capmo list projects error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list Capmo projects' },
      { status: 500 }
    )
  }
}
