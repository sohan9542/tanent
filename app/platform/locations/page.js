import { redirect } from 'next/navigation'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import LocationsManager from './LocationsManager'

export default async function PlatformLocationsPage() {
  // Check authorization
  const platformUser = await getCurrentPlatformUser()

  if (!platformUser) {
    redirect('/platform/login')
  }

  // Fetch defect location labels
  const { data: locations, error } = await supabaseAdmin
    .from('defect_location_labels')
    .select('*')
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('label', { ascending: true })

  return (
    <div className="p-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Locations Management</h2>
        </div>

        <LocationsManager initialLocations={locations || []} />
      </div>
    </div>
  )
}
