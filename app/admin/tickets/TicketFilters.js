'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function TicketFilters({ locations }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '' || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/tickets?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Warranty:</label>
        <select
          onChange={(e) => handleFilterChange('warranty_flag', e.target.value)}
          value={searchParams.get('warranty_flag') || 'all'}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
        >
          <option value="all">All</option>
          <option value="true">Warranty Flagged</option>
          <option value="false">Not Flagged</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Location:</label>
        <select
          onChange={(e) => handleFilterChange('location_id', e.target.value)}
          value={searchParams.get('location_id') || ''}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
        >
          <option value="">All Locations</option>
          {locations?.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
