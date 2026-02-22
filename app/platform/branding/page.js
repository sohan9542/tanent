import { redirect } from 'next/navigation'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import BrandingManager from './BrandingManager'

export default async function PlatformBrandingPage() {
  const platformUser = await getCurrentPlatformUser()

  if (!platformUser) {
    redirect('/platform/login')
  }

  // Platform admins can manage global logos (null organization_id)
  // Logos will be fetched via API which handles organization filtering

  return (
    <div className="p-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Branding & Logos</h2>
        <p className="text-sm text-gray-600 mb-6">
          Upload logos that will appear on PDF reports. Supported formats: JPG, PNG, WebP (max 5MB).
        </p>
        <BrandingManager />
      </div>
    </div>
  )
}
