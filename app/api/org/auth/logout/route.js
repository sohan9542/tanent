import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
} from '@/lib/demo-session'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * POST /api/org/auth/logout - Organization user logout
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()

    cookieStore.set(DEMO_SESSION_COOKIE, '', {
      ...demoSessionCookieOptions(0),
      maxAge: 0,
    })

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              cookieStore.set(name, value, options)
            },
            remove(name, options) {
              cookieStore.set(name, '', options)
            },
          },
        }
      )

      await supabase.auth.signOut()
    }

    const url = new URL(request.url)
    const origin = url.origin

    return NextResponse.redirect(new URL('/org/login', origin))
  } catch (error) {
    console.error('Organization logout error:', error)
    try {
      const url = new URL(request.url)
      const origin = url.origin
      return NextResponse.redirect(new URL('/org/login', origin))
    } catch {
      return NextResponse.redirect(new URL('/org/login', 'http://localhost:3000'))
    }
  }
}
