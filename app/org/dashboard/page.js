import { redirect } from 'next/navigation'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { getUserOrganizations } from '@/lib/staff-auth'
import { getObjectsForOrganization } from '@/lib/object-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'

async function getOrganizationStats(organizationId) {
  // Get objects where org is assigned
  const { data: assignments } = await supabaseAdmin
    .from('object_assignments')
    .select('object_id')
    .or(`owner_org_id.eq.${organizationId},tech_org_id.eq.${organizationId},warranty_org_id.eq.${organizationId}`)

  const objectIds = assignments?.map(a => a.object_id) || []

  // Get ticket count for these objects
  let ticketCount = 0
  if (objectIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('object_id', objectIds)
    ticketCount = count || 0
  }

  // Get user count in organization
  const { count: userCount } = await supabaseAdmin
    .from('organization_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return {
    objectCount: objectIds.length,
    ticketCount,
    userCount: userCount || 0
  }
}

export default async function OrgDashboardPage() {
  const staffUser = await getCurrentStaffUser()

  if (!staffUser) {
    redirect('/org/login')
  }

  const organizations = getUserOrganizations(staffUser)
  const primaryOrg = organizations[0]

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

  const objects = await getObjectsForOrganization(primaryOrg.id)
  const stats = await getOrganizationStats(primaryOrg.id)

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              {primaryOrg.name}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Organization Dashboard
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.objectCount}</div>
                <div className="text-sm text-gray-600">Objects Assigned</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.ticketCount}</div>
                <div className="text-sm text-gray-600">Total Tickets</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.userCount}</div>
                <div className="text-sm text-gray-600">Organization Users</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assigned Objects</h3>
              <Link
                href="/org/objects"
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                View All →
              </Link>
            </div>

            {objects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No objects assigned to this organization yet.
              </p>
            ) : (
              <div className="space-y-2">
                {objects.slice(0, 5).map((assignment) => (
                  <div key={assignment.object_id} className="p-3 bg-gray-50 rounded-md">
                    <div className="font-medium text-gray-900">{assignment.object?.name}</div>
                    <div className="text-sm text-gray-600">
                      {assignment.owner_org_id === primaryOrg.id && 'Owner • '}
                      {assignment.tech_org_id === primaryOrg.id && 'Technical • '}
                      {assignment.warranty_org_id === primaryOrg.id && 'Warranty'}
                    </div>
                  </div>
                ))}
                {objects.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    + {objects.length - 5} more objects
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
  )
}
