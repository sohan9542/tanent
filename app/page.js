import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth/session'

export default async function Home() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('tenant_session')?.value

  if (sessionToken) {
    const session = await verifySession(sessionToken)
    if (session) {
      redirect('/dashboard')
    }
  }

  redirect('/login')
}


