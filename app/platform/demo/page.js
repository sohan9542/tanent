'use client'

import Link from 'next/link'
import { DEMO_PLATFORM_ADMIN, DEMO_SAMPLE_DATA } from '@/lib/demo-config'
import SiteFooter from '@/app/components/site-footer'

/**
 * Static demo preview — no auth or API required.
 * Used when recruiters hit a broken/unavailable backend.
 */
export default function PlatformDemoPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform demo preview</h1>
              <p className="mt-2 text-sm text-gray-600">
                Offline sample data for portfolio walkthroughs. No Supabase session required.
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <Link
                href="/platform/login"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Back to login
              </Link>
              <p className="text-xs text-gray-500">
                Demo admin: {DEMO_PLATFORM_ADMIN.email} / {DEMO_PLATFORM_ADMIN.password}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900 font-medium">Offline / backend-unavailable mode</p>
            <p className="text-sm text-amber-800 mt-1">
              This page always renders sample organizations, objects, and tickets so the UI never
              looks empty when the API is down.
            </p>
          </div>
        </div>

        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEMO_SAMPLE_DATA.organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="px-3 py-3 text-sm text-gray-900">{org.name}</td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Objects</h2>
          <ul className="space-y-3">
            {DEMO_SAMPLE_DATA.objects.map((obj) => (
              <li key={obj.id} className="border border-gray-100 rounded-md p-3">
                <p className="text-sm font-medium text-gray-900">{obj.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {obj.address}, {obj.city}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Owner: {obj.assignment?.owner_org?.name || '—'} · Tech:{' '}
                  {obj.assignment?.tech_org?.name || '—'}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets</h2>
          <div className="space-y-3">
            {DEMO_SAMPLE_DATA.tickets.map((ticket) => (
              <div key={ticket.id} className="border border-gray-100 rounded-md p-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-sm font-medium text-gray-900">{ticket.description}</p>
                  <span className="text-xs rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5">
                    {ticket.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {ticket.category} · {ticket.urgency} · {ticket.object?.name} ·{' '}
                  {ticket.tenant?.first_name} {ticket.tenant?.last_name}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
