'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [objects, setObjects] = useState([])
  const [formData, setFormData] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    objectId: '',
    unitNumber: '',
  })

  useEffect(() => {
    fetchObjects()
  }, [])

  const fetchObjects = async () => {
    try {
      const response = await fetch('/api/platform/objects', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setObjects(data.objects || [])
      }
    } catch (error) {
      console.error('Error fetching objects:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      const response = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors([data.error || 'An error occurred'])
        }
        setLoading(false)
        return
      }

      // Success - redirect to tenants list
      router.push('/platform/tenants')
    } catch (error) {
      console.error('Error creating tenant:', error)
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
          href="/platform/tenants"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Tenants
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Create New Tenant</h2>

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
              <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="tenantId"
                name="tenantId"
                required
                value={formData.tenantId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., TENANT001"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="objectId" className="block text-sm font-medium text-gray-700 mb-2">
                Object (Building) <span className="text-red-500">*</span>
              </label>
              <select
                id="objectId"
                name="objectId"
                required
                value={formData.objectId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select an object...</option>
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Unit Number
              </label>
              <input
                type="text"
                id="unitNumber"
                name="unitNumber"
                value={formData.unitNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 101"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Link
                href="/platform/tenants"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
