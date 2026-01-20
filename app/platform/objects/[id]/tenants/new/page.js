'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function NewTenantPage() {
  const router = useRouter()
  const params = useParams()
  const objectId = params.id

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [object, setObject] = useState(null)
  const [formData, setFormData] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    unitNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    floor: '',
    additionalNotes: '',
  })

  useEffect(() => {
    fetchObject()
  }, [objectId])

  const fetchObject = async () => {
    try {
      const response = await fetch(`/api/platform/objects/${objectId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setObject(data.object)
      } else {
        if (response.status === 401) {
          router.push('/platform/login')
          return
        }
        setErrors([data.error || 'Failed to load object'])
      }
    } catch (error) {
      console.error('Error fetching object:', error)
      setErrors(['Failed to load object'])
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
        body: JSON.stringify({
          ...formData,
          objectId: objectId, // Always link to this object
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/platform/login')
          return
        }
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors([data.error || 'An error occurred'])
        }
        setLoading(false)
        return
      }

      // Success - redirect back to object detail page
      router.push(`/platform/objects/${objectId}`)
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

  if (!object) {
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
          href={`/platform/objects/${objectId}`}
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Object
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Tenant</h2>
            <p className="text-sm text-gray-600 mt-1">For: <strong>{object.name}</strong></p>
          </div>

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

            <div>
              <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
                Floor
              </label>
              <input
                type="text"
                id="floor"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 3rd Floor, Ground Floor"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contractStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Contract
                </label>
                <input
                  type="date"
                  id="contractStartDate"
                  name="contractStartDate"
                  value={formData.contractStartDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="contractEndDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End of Contract
                </label>
                <input
                  type="date"
                  id="contractEndDate"
                  name="contractEndDate"
                  value={formData.contractEndDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="additionalNotes"
                name="additionalNotes"
                rows={4}
                value={formData.additionalNotes}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Any additional information about the tenant..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Link
                href={`/platform/objects/${objectId}`}
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
