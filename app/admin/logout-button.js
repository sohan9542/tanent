'use client'

import { useRouter } from 'next/navigation'

export default function AdminLogoutButton({ logoutUrl }) {
  const router = useRouter()

  const handleLogout = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(logoutUrl, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        router.push('/admin/login')
        router.refresh()
      } else {
        window.location.href = logoutUrl
      }
    } catch {
      window.location.href = logoutUrl
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium"
    >
      Logout
    </button>
  )
}
