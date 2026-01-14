'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewObjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      const response = await fetch('/api/platform/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors([data.error || 'An error occurred'])
        setLoading(false)
        return
      }

      // Success - redirect to objects list
      router.push('/platform/objects')
    } catch (error) {
      console.error('Error creating object:', error)
      setErrors(['An error occurred. Please try again.'])
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/platform/objects"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Objects
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Create New Object</h2>

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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Object Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Building A"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Street address, city, etc."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Link
                href="/platform/objects"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Object'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
