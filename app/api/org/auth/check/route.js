import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'

/**
 * GET /api/org/auth/check - Check if organization user is authenticated
 */
export async function GET() {
  try {
    const user = await getCurrentStaffUser()
    
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
        organizations: user.memberships?.map(m => ({
          id: m.organization?.id,
          name: m.organization?.name,
          role: m.role
        })) || []
      }
    })
  } catch (error) {
    console.error('Organization auth check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}
