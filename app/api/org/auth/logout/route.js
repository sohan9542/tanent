import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DEMO_COOKIE, demoCookieOptions } from '@/lib/demo-session'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    cookieStore.set(DEMO_COOKIE, '', { ...demoCookieOptions(0), maxAge: 0 })

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
        })
        await supabase.auth.signOut()
      } catch {
        // ignore — static demo logout still works
      }
    }

    const url = new URL(request.url)
    return NextResponse.redirect(new URL('/org/login', url.origin))
  } catch (error) {
    console.error('Organization logout error:', error)
    try {
      const url = new URL(request.url)
      return NextResponse.redirect(new URL('/org/login', url.origin))
    } catch {
      return NextResponse.redirect(
        new URL('/org/login', 'http://localhost:3000')
      )
    }
  }
}
