'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DeleteModal from './delete-modal'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, tenant: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const limit = 20

  useEffect(() => {
    fetchTenants()
  }, [page, search])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/admin/tenants?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setTenants(data.tenants || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (tenant) => {
    setDeleteModal({ isOpen: true, tenant })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.tenant) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/tenants/${deleteModal.tenant.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteModal({ isOpen: false, tenant: null })
        fetchTenants()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete tenant')
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
      alert('An error occurred while deleting the tenant')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteClose = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, tenant: null })
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <main className="max-w-7xl mx-auto py-4 sm:py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-4 sm:py-6 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tenant Management</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/admin/tenants/import"
              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-center"
            >
              Import Tenants
            </Link>
            <Link
              href="/admin/tenants/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-center"
            >
              New Tenant
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tenants found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
                      Email
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Phone
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Unit
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
                        {tenant.email || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {tenant.phone || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {tenant.unit_number || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            tenant.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/admin/tenants/${tenant.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(tenant)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{tenant.tenant_id}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {tenant.first_name} {tenant.last_name}
                      </p>
                    </div>
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    {tenant.email && (
                      <div>
                        <dt className="font-medium text-gray-700">Email</dt>
                        <dd className="mt-1 truncate">{tenant.email}</dd>
                      </div>
                    )}
                    {tenant.phone && (
                      <div>
                        <dt className="font-medium text-gray-700">Phone</dt>
                        <dd className="mt-1">{tenant.phone}</dd>
                      </div>
                    )}
                    {tenant.unit_number && (
                      <div>
                        <dt className="font-medium text-gray-700">Unit</dt>
                        <dd className="mt-1">{tenant.unit_number}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(tenant)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-0 sm:space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        tenant={deleteModal.tenant}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </main>
  )
}


