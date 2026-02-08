'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const TRADES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Roofing',
  'Flooring',
  'Masonry',
  'Landscaping',
  'General Maintenance',
  'Other'
]

export default function CraftsmanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const craftsmanId = params.id

  const [craftsman, setCraftsman] = useState(null)
  const [objectAssignments, setObjectAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    trade: '',
    notes: '',
    is_active: true
  })

  useEffect(() => {
    fetchCraftsman()
  }, [craftsmanId])

  const fetchCraftsman = async () => {
    try {
      const response = await fetch(`/api/org/craftsmen/${craftsmanId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch craftsman')
      }

      setCraftsman(data.craftsman)
      setObjectAssignments(data.objectAssignments || [])
      setFormData({
        name: data.craftsman.name || '',
        phone: data.craftsman.phone || '',
        email: data.craftsman.email || '',
        trade: data.craftsman.trade || '',
        notes: data.craftsman.notes || '',
        is_active: data.craftsman.is_active
      })
    } catch (err) {
      setError(err.message || 'Failed to load craftsman')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/org/craftsmen/${craftsmanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update craftsman')
      }

      setCraftsman(data.craftsman)
      setEditMode(false)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/org/craftsmen/${craftsmanId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete craftsman')
      }

      router.push('/org/craftsmen')
    } catch (err) {
      setError(err.message || 'An error occurred')
      setSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    )
  }

  if (!craftsman) {
    return (
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900">Craftsman not found</h2>
          <Link
            href="/org/craftsmen"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Craftsmen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/org/craftsmen"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Craftsmen
        </Link>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Deactivate Craftsman
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to deactivate <strong>{craftsman.name}</strong>? 
                This craftsman will be marked as inactive but their records will be preserved.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Craftsman Details Card */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {craftsman.name}
              </h2>
              <p className="text-sm text-gray-500">{craftsman.organization?.name}</p>
            </div>
            <div className="flex space-x-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                  >
                    Edit
                  </button>
                  {craftsman.is_active && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Deactivate
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      setFormData({
                        name: craftsman.name || '',
                        phone: craftsman.phone || '',
                        email: craftsman.email || '',
                        trade: craftsman.trade || '',
                        notes: craftsman.notes || '',
                        is_active: craftsman.is_active
                      })
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trade</label>
                <select
                  name="trade"
                  value={formData.trade}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a trade</option>
                  {TRADES.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Trade</dt>
                <dd className="mt-1">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-sm font-semibold text-blue-800">
                    {craftsman.trade}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex rounded-full px-2 py-1 text-sm font-semibold ${
                    craftsman.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {craftsman.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {craftsman.phone || <span className="text-gray-400">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {craftsman.email || <span className="text-gray-400">—</span>}
                </dd>
              </div>
              {craftsman.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {craftsman.notes}
                  </dd>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Object Assignments */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Assigned to Objects
          </h3>
          {objectAssignments.length === 0 ? (
            <p className="text-sm text-gray-500">Not assigned to any objects yet.</p>
          ) : (
            <div className="space-y-3">
              {objectAssignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <div className="font-medium text-gray-900">{assignment.object?.name}</div>
                    {assignment.object?.address && (
                      <div className="text-sm text-gray-500">{assignment.object.address}</div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500">
            To assign this craftsman to objects, go to the Objects page and manage craftsmen from there.
          </p>
        </div>
      </div>
    </main>
  )
}
