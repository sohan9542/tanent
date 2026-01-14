import { NextResponse } from 'next/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'

/**
 * GET /api/platform/auth/check - Check if platform user is authenticated
 */
export async function GET() {
  try {
    const user = await getCurrentPlatformUser()
    
    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Platform auth check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}
