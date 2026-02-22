import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import OrganizationLogos from './OrganizationLogos'

async function getOrganization(id) {
  const { data: organization, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching organization:', error)
    return null
  }

  return organization
}

async function getOrganizationUsers(organizationId) {
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

async function getOrganizationObjects(organizationId) {
  const { data: assignments, error } = await supabaseAdmin
    .from('object_assignments')
    .select(`
      *,
      object:objects(id, name, address)
    `)
    .or(`owner_org_id.eq.${organizationId},tech_org_id.eq.${organizationId},warranty_org_id.eq.${organizationId}`)

  if (error) {
    console.error('Error fetching objects:', error)
    return []
  }

  return assignments || []
}

export default async function OrganizationDetailPage({ params }) {
  await requirePlatformAdmin()

  const resolvedParams = await params
  const organizationId = resolvedParams.id

  const organization = await getOrganization(organizationId)
  const users = await getOrganizationUsers(organizationId)
  const objects = await getOrganizationObjects(organizationId)

  if (!organization) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <p className="text-red-600">Organization not found</p>
            <Link
              href="/platform/organizations"
              className="mt-4 text-indigo-600 hover:text-indigo-900 inline-block"
            >
              ← Back to Organizations
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/platform/organizations"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to Organizations
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {organization.name}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Created: {new Date(organization.created_at).toLocaleDateString()}
          </p>
          <div className="mt-4">
            <Link
              href={`/platform/organizations/${organizationId}/users/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add User to Organization
            </Link>
          </div>
        </div>

        {/* Organization Users */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Users</h3>
          {users.length === 0 ? (
            <p className="text-gray-500 text-sm">No users in this organization yet.</p>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          user.membership_role === 'org_admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.membership_role === 'org_admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Organization Logos */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding & Logos</h3>
          <OrganizationLogos organizationId={organizationId} />
        </div>

        {/* Assigned Objects */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Objects</h3>
          {objects.length === 0 ? (
            <p className="text-gray-500 text-sm">This organization is not assigned to any objects yet.</p>
          ) : (
            <div className="space-y-2">
              {objects.map((assignment) => (
                <div key={assignment.object_id} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-medium text-gray-900">{assignment.object?.name}</div>
                  <div className="text-sm text-gray-600">
                    {assignment.owner_org_id === organizationId && 'Owner • '}
                    {assignment.tech_org_id === organizationId && 'Technical • '}
                    {assignment.warranty_org_id === organizationId && 'Warranty'}
                  </div>
                  {assignment.object?.address && (
                    <div className="text-xs text-gray-500 mt-1">{assignment.object.address}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
