import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { locale } = await request.json()

    // Validate locale
    if (!['en', 'de'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    
    // Set the locale cookie
    cookieStore.set('tenant_locale', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({ success: true, locale })
  } catch (error) {
    console.error('Error setting locale:', error)
    return NextResponse.json(
      { error: 'Failed to set locale' },
      { status: 500 }
    )
  }
}
