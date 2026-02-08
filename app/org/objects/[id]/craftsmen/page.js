'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ObjectCraftsmenPage() {
  const params = useParams()
  const objectId = params.id

  const [object, setObject] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [assignedCraftsmen, setAssignedCraftsmen] = useState([])
  const [availableCraftsmen, setAvailableCraftsmen] = useState([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(null)

  useEffect(() => {
    fetchData()
  }, [objectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch object details
      const objRes = await fetch(`/api/org/objects/${objectId}`)
      const objData = await objRes.json()
      
      if (!objRes.ok) {
        throw new Error(objData.error || 'Failed to fetch object')
      }
      
      setObject(objData.object)
      setAssignment(objData.assignment)

      // Fetch assigned craftsmen
      const craftsmenRes = await fetch(`/api/org/objects/${objectId}/craftsmen`)
      const craftsmenData = await craftsmenRes.json()
      
      if (!craftsmenRes.ok) {
        throw new Error(craftsmenData.error || 'Failed to fetch craftsmen')
      }
      
      setAssignedCraftsmen(craftsmenData.objectCraftsmen || [])
      setCanManage(craftsmenData.canManage)

      // Fetch all available craftsmen from org
      const allCraftsmenRes = await fetch('/api/org/craftsmen')
      const allCraftsmenData = await allCraftsmenRes.json()
      
      // Filter to active craftsmen not already assigned
      const assignedIds = (craftsmenData.objectCraftsmen || []).map(oc => oc.craftsman?.id)
      const available = (allCraftsmenData.craftsmen || []).filter(
        c => c.is_active && !assignedIds.includes(c.id)
      )
      setAvailableCraftsmen(available)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (craftsmanId) => {
    setActionLoading(craftsmanId)
    setError(null)

    try {
      const response = await fetch(`/api/org/objects/${objectId}/craftsmen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ craftsman_id: craftsmanId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign craftsman')
      }

      // Refresh data
      fetchData()
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnassign = async (craftsmanId) => {
    setActionLoading(craftsmanId)
    setError(null)
    setShowUnassignConfirm(null)

    try {
      const response = await fetch(`/api/org/objects/${objectId}/craftsmen/${craftsmanId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign craftsman')
      }

      // Refresh data
      fetchData()
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setActionLoading(null)
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

  return (
    <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/org/objects"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Objects
        </Link>

        {/* Unassign Confirmation Modal */}
        {showUnassignConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Unassign Craftsman
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to unassign this craftsman from <strong>{object?.name}</strong>?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowUnassignConfirm(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnassign(showUnassignConfirm)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Unassigning...' : 'Unassign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Object Header */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Craftsmen for {object?.name}
          </h2>
          {object?.address && (
            <p className="text-sm text-gray-500">{object.address}</p>
          )}
          {!canManage && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Only the technical organization can manage craftsmen for this object.
              </p>
            </div>
          )}
        </div>

        {/* Assigned Craftsmen */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Assigned Craftsmen
          </h3>
          
          {assignedCraftsmen.length === 0 ? (
            <p className="text-sm text-gray-500">No craftsmen assigned to this object yet.</p>
          ) : (
            <div className="space-y-3">
              {assignedCraftsmen.map((oc) => (
                <div 
                  key={oc.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-gray-900">{oc.craftsman?.name}</div>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        {oc.craftsman?.trade}
                      </span>
                      {!oc.craftsman?.is_active && (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-x-4">
                      {oc.craftsman?.phone && <span>{oc.craftsman.phone}</span>}
                      {oc.craftsman?.email && <span>{oc.craftsman.email}</span>}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setShowUnassignConfirm(oc.craftsman?.id)}
                      disabled={actionLoading === oc.craftsman?.id}
                      className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoading === oc.craftsman?.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Craftsmen to Assign */}
        {canManage && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Craftsmen
            </h3>
            
            {availableCraftsmen.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-4">
                  No available craftsmen to assign. All craftsmen are either already assigned or inactive.
                </p>
                <Link
                  href="/org/craftsmen/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add New Craftsman
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCraftsmen.map((craftsman) => (
                  <div 
                    key={craftsman.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-gray-900">{craftsman.name}</div>
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          {craftsman.trade}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500 space-x-4">
                        {craftsman.phone && <span>{craftsman.phone}</span>}
                        {craftsman.email && <span>{craftsman.email}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(craftsman.id)}
                      disabled={actionLoading === craftsman.id}
                      className="ml-4 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === craftsman.id ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
