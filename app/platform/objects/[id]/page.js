'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ObjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const objectId = params.id

  const [object, setObject] = useState(null)
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [capmoProjectId, setCapmoProjectId] = useState('')
  const [capmoProjectName, setCapmoProjectName] = useState('')
  const [savingCapmo, setSavingCapmo] = useState(false)
  const [capmoMessage, setCapmoMessage] = useState(null)
  const [testingCapmo, setTestingCapmo] = useState(false)
  const [fetchingCapmoProjects, setFetchingCapmoProjects] = useState(false)
  const [fetchingCapmoProject, setFetchingCapmoProject] = useState(false)
  const [capmoProjects, setCapmoProjects] = useState(null)
  const [capmoProjectDetails, setCapmoProjectDetails] = useState(null)

  useEffect(() => {
    fetchObject()
    fetchTenants()
  }, [objectId])

  const fetchObject = async () => {
    try {
      const response = await fetch(`/api/platform/objects/${objectId}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        setObject(data.object)
        setCapmoProjectId(data.object?.capmo_project_id || '')
        setCapmoProjectName(data.object?.capmo_project_name || '')
      } else {
        if (response.status === 401) {
          router.push('/platform/login')
          return
        }
        setError(data.error || 'Failed to load object')
      }
    } catch (err) {
      setError(err.message || 'Failed to load object')
    } finally {
      setLoading(false)
    }
  }

  const saveCapmoMapping = async () => {
    try {
      setSavingCapmo(true)
      setCapmoMessage(null)

      const response = await fetch(`/api/platform/objects/${objectId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          capmo_project_id: capmoProjectId,
          capmo_project_name: capmoProjectName
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setCapmoMessage({ type: 'error', text: data.error || 'Failed to save Capmo mapping' })
        return
      }

      setObject(data.object)
      setCapmoMessage({ type: 'success', text: 'Capmo mapping saved' })
    } catch (err) {
      setCapmoMessage({ type: 'error', text: err.message || 'Failed to save Capmo mapping' })
    } finally {
      setSavingCapmo(false)
    }
  }

  const testCapmoConnection = async () => {
    try {
      setTestingCapmo(true)
      setCapmoMessage(null)
      const response = await fetch('/api/platform/integrations/capmo/test', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        setCapmoMessage({ type: 'error', text: data.error || 'Capmo validation failed' })
        return
      }
      setCapmoMessage({ type: 'success', text: 'Capmo connection validated' })
    } catch (err) {
      setCapmoMessage({ type: 'error', text: err.message || 'Capmo validation failed' })
    } finally {
      setTestingCapmo(false)
    }
  }

  const fetchCapmoProjects = async () => {
    try {
      setFetchingCapmoProjects(true)
      setCapmoMessage(null)
      setCapmoProjects(null)
      const response = await fetch('/api/platform/integrations/capmo/projects', {
        method: 'GET',
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        setCapmoMessage({ type: 'error', text: data.error || 'Failed to fetch Capmo projects' })
        return
      }
      setCapmoProjects(data.projects || [])
      setCapmoMessage({ type: 'success', text: `Fetched ${data.projects?.length || 0} Capmo projects` })
    } catch (err) {
      setCapmoMessage({ type: 'error', text: err.message || 'Failed to fetch Capmo projects' })
    } finally {
      setFetchingCapmoProjects(false)
    }
  }

  const fetchCapmoProject = async () => {
    if (!capmoProjectId) {
      setCapmoMessage({ type: 'error', text: 'Enter a Capmo Project ID first' })
      return
    }
    try {
      setFetchingCapmoProject(true)
      setCapmoMessage(null)
      setCapmoProjectDetails(null)
      const response = await fetch(`/api/platform/integrations/capmo/projects/${capmoProjectId}`, {
        method: 'GET',
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        setCapmoMessage({ type: 'error', text: data.error || 'Failed to fetch Capmo project' })
        return
      }
      setCapmoProjectDetails(data.project || null)
      setCapmoMessage({ type: 'success', text: 'Fetched Capmo project details' })
    } catch (err) {
      setCapmoMessage({ type: 'error', text: err.message || 'Failed to fetch Capmo project' })
    } finally {
      setFetchingCapmoProject(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const response = await fetch(`/api/platform/tenants?object_id=${objectId}&limit=100`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        setTenants(data.tenants || [])
      } else {
        if (response.status === 401) {
          router.push('/platform/login')
          return
        }
        console.error('Failed to load tenants:', data.error)
      }
    } catch (err) {
      console.error('Error fetching tenants:', err)
    } finally {
      setTenantsLoading(false)
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

  if (error || !object) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <p className="text-red-600">{error || 'Object not found'}</p>
            <Link
              href="/platform/objects"
              className="mt-4 text-indigo-600 hover:text-indigo-900 inline-block"
            >
              ← Back to Objects
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const assignment = object.assignment?.[0]

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/platform/objects"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Objects
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {object.name}
              </h2>
              {object.object_id && (
                <p className="text-sm text-gray-500 mb-2">Object ID: <span className="font-medium">{object.object_id}</span></p>
              )}
              <div className="mt-3 space-y-1">
                {(object.street || object.zip || object.city) && (
                  <div className="text-sm text-gray-600">
                    {object.street && <span>{object.street}</span>}
                    {object.street && (object.zip || object.city) && <span>, </span>}
                    {object.zip && <span>{object.zip}</span>}
                    {object.zip && object.city && <span> </span>}
                    {object.city && <span>{object.city}</span>}
                  </div>
                )}
                {object.address && (
                  <p className="text-sm text-gray-600">{object.address}</p>
                )}
              </div>
            </div>
            <Link
              href={`/platform/objects/${objectId}/assignments`}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Manage Assignments
            </Link>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Organization Assignments</h3>
         
            </div>
            {assignment ? (
              <div className="space-y-3">
                {assignment.owner_org && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700">Owner Organization</div>
                    <div className="text-sm text-gray-900">{assignment.owner_org.name}</div>
                  </div>
                )}
                {assignment.tech_org && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700">Technical Organization</div>
                    <div className="text-sm text-gray-900">{assignment.tech_org.name}</div>
                  </div>
                )}
                {assignment.warranty_org && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700">Warranty Organization</div>
                    <div className="text-sm text-gray-900">{assignment.warranty_org.name}</div>
                  </div>
                )}
                {!assignment.owner_org && !assignment.tech_org && !assignment.warranty_org && (
                  <p className="text-sm text-gray-500">No organizations assigned yet.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No assignments configured. Click "Manage Assignments" to set up organizations.</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Capmo Integration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capmo Project ID
              </label>
              <input
                type="text"
                value={capmoProjectId}
                onChange={(e) => setCapmoProjectId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capmo Project Name
              </label>
              <input
                type="text"
                value={capmoProjectName}
                onChange={(e) => setCapmoProjectName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional label"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              type="button"
              onClick={saveCapmoMapping}
              disabled={savingCapmo}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingCapmo ? 'Saving...' : 'Save Capmo Mapping'}
            </button>
            <button
              type="button"
              onClick={testCapmoConnection}
              disabled={testingCapmo}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
            >
              {testingCapmo ? 'Testing...' : 'Test Capmo Connection'}
            </button>
            {/* <button
              type="button"
              onClick={fetchCapmoProjects}
              disabled={fetchingCapmoProjects}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
            >
              {fetchingCapmoProjects ? 'Loading...' : 'Fetch Capmo Projects'}
            </button>
            <button
              type="button"
              onClick={fetchCapmoProject}
              disabled={fetchingCapmoProject}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
            >
              {fetchingCapmoProject ? 'Loading...' : 'Fetch Capmo Project'}
            </button> */}
            {capmoMessage && (
              <span
                className={`text-sm ${
                  capmoMessage.type === 'error' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {capmoMessage.text}
              </span>
            )}
          </div>
          {capmoProjects && (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Capmo Projects ({capmoProjects.length})
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {JSON.stringify(capmoProjects, null, 2)}
              </pre>
            </div>
          )}
          {capmoProjectDetails && (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Capmo Project Details
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {JSON.stringify(capmoProjectDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Tenants Section */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Tenants</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={`/platform/objects/${objectId}/tenants/new`}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Tenant
              </Link>
              <Link
                href={`/platform/objects/${objectId}/tenants/import`}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Import Tenants
              </Link>
            </div>
          </div>

          {tenantsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading tenants...</p>
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No tenants found for this object.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/platform/objects/${objectId}/tenants/new`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create First Tenant
                </Link>
                <Link
                  href={`/platform/objects/${objectId}/tenants/import`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Import Tenants
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Tenant ID
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Name
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Unit Number
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Floor
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Email
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Phone
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Contract Start
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Contract End
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {tenants.map((tenant) => (
                        <tr key={tenant.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {tenant.tenant_id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.first_name} {tenant.last_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.unit_number || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.floor || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.email || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.phone || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.contract_start_date 
                              ? new Date(tenant.contract_start_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {tenant.contract_end_date 
                              ? new Date(tenant.contract_end_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {tenant.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/platform/tenants/${tenant.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
