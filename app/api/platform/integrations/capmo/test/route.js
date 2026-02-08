import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { validate } from '@/lib/integrations/capmo/client'

export async function POST() {
  try {
    await requirePlatformAdmin()
    const result = await validate()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Capmo validate error:', error)
    return NextResponse.json(
      { error: error.message || 'Capmo validation failed' },
      { status: 500 }
    )
  }
}
