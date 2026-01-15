import { redirect } from 'next/navigation'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { getObjectsForOrganization } from '@/lib/object-auth'
import Link from 'next/link'

export default async function OrgObjectsPage() {
  const staffUser = await getCurrentStaffUser()

  if (!staffUser) {
    redirect('/org/login')
  }

  const isAdmin = isOrganizationAdmin(staffUser)

  const organizations = getUserOrganizations(staffUser)
  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h1>
          <p className="text-gray-600">You are not a member of any organization.</p>
        </div>
      </div>
    )
  }

  const orgId = organizations[0].id
  const assignments = await getObjectsForOrganization(orgId)

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Assigned Objects</h2>

            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No objects assigned to your organization yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Object Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Address
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Your Organization's Role
                      </th>
                      {isAdmin && (
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {assignments.map((assignment) => (
                      <tr key={assignment.object_id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {assignment.object?.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {assignment.object?.address || 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            {assignment.owner_org_id === orgId && (
                              <span className="inline-flex rounded-full px-2 text-xs font-semibold bg-blue-100 text-blue-800">
                                Owner
                              </span>
                            )}
                            {assignment.tech_org_id === orgId && (
                              <span className="inline-flex rounded-full px-2 text-xs font-semibold bg-green-100 text-green-800">
                                Technical
                              </span>
                            )}
                            {assignment.warranty_org_id === orgId && (
                              <span className="inline-flex rounded-full px-2 text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Warranty
                              </span>
                            )}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/org/objects/${assignment.object_id}/roles`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Manage Roles
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
  )
}
