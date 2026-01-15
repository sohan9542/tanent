import { redirect } from 'next/navigation'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'

async function getOrgUsers(organizationId) {
  const { data: memberships, error } = await supabaseAdmin
    .from('organization_memberships')
    .select(`
      *,
      user:platform_users(id, name, email, is_active)
    `)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (memberships || []).map(m => ({
    ...m.user,
    membership_role: m.role,
    membership_id: m.id
  }))
}

export default async function OrgUsersPage() {
  const staffUser = await getCurrentStaffUser()

  if (!staffUser) {
    redirect('/org/login')
  }

  const isAdmin = isOrganizationAdmin(staffUser)

  const primaryOrg = staffUser.memberships?.[0]?.organization
  if (!primaryOrg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h1>
          <p className="text-gray-600">You are not a member of any organization.</p>
        </div>
      </div>
    )
  }

  const users = await getOrgUsers(primaryOrg.id)

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Organization Users</h2>
              {isAdmin && (
                <Link
                  href="/org/users/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add User
                </Link>
              )}
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No users found.</p>
                {isAdmin && (
                  <Link
                    href="/org/users/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add First User
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Email
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Role
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      {isAdmin && (
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {user.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                            user.membership_role === 'org_admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.membership_role === 'org_admin' ? 'Admin' : 'Staff'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/org/users/${user.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
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
