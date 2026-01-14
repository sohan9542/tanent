'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditTenantPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    isActive: true,
  })

  useEffect(() => {
    fetchObjects()
    fetchTenant()
  }, [tenantId])

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

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        setFormData({
          tenantId: data.tenantId || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          objectId: data.objectId || '',
          unitNumber: data.unitNumber || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
        })
      } else {
        setErrors([data.error || 'Failed to load tenant'])
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
      setErrors(['Failed to load tenant'])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors([])

    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: 'PUT',
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
        setSaving(false)
        return
      }

      // Success - redirect to tenants list
      router.push('/platform/tenants')
    } catch (error) {
      console.error('Error updating tenant:', error)
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
          href="/platform/tenants"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Tenants
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Edit Tenant</h2>

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
              <button
                onClick={() => router.push('/platform/objects')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </button>
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
