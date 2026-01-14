'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ObjectRolesPage() {
  const router = useRouter()
  const params = useParams()
  const objectId = params.id

  const [object, setObject] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [orgUsers, setOrgUsers] = useState([])
  const [existingRoles, setExistingRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [objectId])

  const fetchData = async () => {
    try {
      // Fetch object and assignment
      const objRes = await fetch(`/api/org/objects/${objectId}`)
      const objData = await objRes.json()
      setObject(objData.object)
      setAssignment(objData.assignment)

      // Fetch organization users
      const usersRes = await fetch('/api/org/users')
      const usersData = await usersRes.json()
      setOrgUsers(usersData.users || [])

      // Fetch existing object roles for this object
      const rolesRes = await fetch(`/api/org/objects/${objectId}/roles`)
      const rolesData = await rolesRes.json()
      setExistingRoles(rolesData.roles || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async (userId, roleType, categoryScope = null) => {
    try {
      const response = await fetch(`/api/org/objects/${objectId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role_type: roleType,
          category_scope: categoryScope
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add role')
      }

      // Refresh roles
      fetchData()
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleRemoveRole = async (roleId) => {
    try {
      const response = await fetch(`/api/org/objects/${objectId}/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove role')
      }

      // Refresh roles
      fetchData()
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // Determine which role types org can assign based on assignment
  const canAssignOwner = assignment?.owner_org_id !== null
  const canAssignTech = assignment?.tech_org_id !== null
  const canAssignWarranty = assignment?.warranty_org_id !== null

  return (
    <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link
            href="/org/objects"
            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
          >
            ← Back to Objects
          </Link>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Assign Users to {object?.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign organization users to this object with role types. You can only assign roles that match your organization's assignment on this object.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Existing Roles */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Assignments</h3>
              {existingRoles.length === 0 ? (
                <p className="text-gray-500 text-sm">No users assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {existingRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="font-medium text-gray-900">{role.user?.name}</div>
                        <div className="text-sm text-gray-600">
                          {role.role_type} {role.category_scope && `(${role.category_scope})`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRole(role.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Role */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add User Role</h3>
              <div className="space-y-4">
                {orgUsers.map((user) => (
                  <div key={user.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="font-medium text-gray-900 mb-3">{user.name} ({user.email})</div>
                    <div className="flex flex-wrap gap-2">
                      {canAssignOwner && (
                        <button
                          onClick={() => handleAddRole(user.id, 'owner')}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                        >
                          Assign as Owner
                        </button>
                      )}
                      {canAssignTech && (
                        <button
                          onClick={() => handleAddRole(user.id, 'technical')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                        >
                          Assign as Technical
                        </button>
                      )}
                      {canAssignWarranty && (
                        <>
                          <button
                            onClick={() => handleAddRole(user.id, 'warranty')}
                            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                          >
                            Assign as Warranty (All)
                          </button>
                          <button
                            onClick={() => {
                              const category = prompt('Enter category scope (plumbing, electrical, heating, other):')
                              if (category) {
                                handleAddRole(user.id, 'warranty', category)
                              }
                            }}
                            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                          >
                            Assign as Warranty (Category)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
  )
}
