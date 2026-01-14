'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditPlatformUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'platform_staff',
    isActive: true,
  })

  useEffect(() => {
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/platform/users/${userId}`)
      const data = await response.json()

      if (response.ok) {
        setFormData({
          email: data.email || '',
          name: data.name || '',
          password: '', // Don't populate password
          role: data.role || 'platform_staff',
          isActive: data.isActive !== undefined ? data.isActive : true,
        })
      } else {
        setErrors([data.error || 'Failed to load user'])
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setErrors(['Failed to load user'])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors([])

    try {
      const updateData = { ...formData }
      // Only include password if it's been set
      if (!updateData.password) {
        delete updateData.password
      }

      const response = await fetch(`/api/platform/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors([data.error || 'An error occurred'])
        setSaving(false)
        return
      }

      // Success - redirect to users list
      router.push('/platform/users')
    } catch (error) {
      console.error('Error updating user:', error)
      setErrors(['An error occurred. Please try again.'])
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/platform/users"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Users
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Edit Platform User</h2>

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <ul className="list-disc list-inside text-sm text-red-800">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password (leave blank to keep current)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter new password (minimum 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="platform_staff">Platform Staff</option>
                <option value="platform_admin">Platform Admin</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Link
                href="/platform/users"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
