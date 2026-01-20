'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PlatformObjectsPage() {
  const router = useRouter()
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

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
      } else {
        if (response.status === 401) {
          router.push('/platform/login')
          return
        }
        setError(data.error || 'Failed to load objects')
      }
    } catch (err) {
      setError(err.message || 'Failed to load objects')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (objectId, objectName) => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/objects/${objectId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setDeleteConfirm(null)
        fetchObjects() // Refresh list
      } else {
        setError(data.error || 'Failed to delete object')
      }
    } catch (err) {
      setError(err.message || 'Failed to delete object')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Objects (Buildings)</h2>
            <Link
              href="/platform/objects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Object
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {objects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No objects found.</p>
              <Link
                href="/platform/objects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create First Object
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Object ID
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Street
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Zip
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        City
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Organizations
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {objects.map((obj) => {
                      const assignment = obj.assignment?.[0]
                      return (
                        <tr key={obj.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {obj.object_id || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm font-medium text-gray-900">
                            {obj.name}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {obj.street || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {obj.zip || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {obj.city || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <div className="space-y-1">
                              {assignment?.owner_org && (
                                <div>Owner: {assignment.owner_org.name}</div>
                              )}
                              {assignment?.tech_org && (
                                <div>Tech: {assignment.tech_org.name}</div>
                              )}
                              {assignment?.warranty_org && (
                                <div>Warranty: {assignment.warranty_org.name}</div>
                              )}
                              {!assignment?.owner_org && !assignment?.tech_org && !assignment?.warranty_org && (
                                <span className="text-gray-400">No assignments</span>
                              )}
                            </div>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={`/platform/objects/${obj.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => setDeleteConfirm({ id: obj.id, name: obj.name })}
                                className="text-red-600 hover:text-red-900"
                                disabled={deleting}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
