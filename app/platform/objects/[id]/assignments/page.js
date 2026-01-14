'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ObjectAssignmentsPage() {
  const router = useRouter()
  const params = useParams()
  const objectId = params.id

  const [object, setObject] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [assignment, setAssignment] = useState({
    owner_org_id: null,
    tech_org_id: null,
    warranty_org_id: null
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [objectId])

  const fetchData = async () => {
    try {
      // Fetch object
      const objRes = await fetch(`/api/platform/objects/${objectId}`)
      const objData = await objRes.json()
      setObject(objData.object)

      // Fetch assignment
      if (objData.object?.assignment) {
        setAssignment({
          owner_org_id: objData.object.assignment.owner_org_id || null,
          tech_org_id: objData.object.assignment.tech_org_id || null,
          warranty_org_id: objData.object.assignment.warranty_org_id || null
        })
      }

      // Fetch all organizations
      const orgsRes = await fetch('/api/platform/organizations')
      const orgsData = await orgsRes.json()
      setOrganizations(orgsData.organizations || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/objects/${objectId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignments')
      }

      router.push(`/platform/objects/${objectId}`)
    } catch (err) {
      setError(err.message || 'An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Assign Organizations to {object?.name}
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Organization
                  </label>
                  <select
                    value={assignment.owner_org_id || ''}
                    onChange={(e) => setAssignment({ ...assignment, owner_org_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">None</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Organization responsible for ownership/oversight of this object
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technical Manager Organization
                  </label>
                  <select
                    value={assignment.tech_org_id || ''}
                    onChange={(e) => setAssignment({ ...assignment, tech_org_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">None</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Organization responsible for operational/technical management
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warranty Manager Organization
                  </label>
                  <select
                    value={assignment.warranty_org_id || ''}
                    onChange={(e) => setAssignment({ ...assignment, warranty_org_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">None</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Organization responsible for warranty issues (optionally category-scoped)
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <Link
                  href={`/platform/objects/${objectId}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
  )
}
