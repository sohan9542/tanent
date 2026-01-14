import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import PreTicketThread from './pre-ticket-thread'

async function getPreTicket(id, tenantId) {
  const { data: preTicket, error } = await supabaseAdmin
    .from('pre_tickets')
    .select(`
      *,
      object:objects(id, name)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !preTicket) {
    return null
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabaseAdmin
    .from('pre_ticket_messages')
    .select('*')
    .eq('pre_ticket_id', id)
    .order('created_at', { ascending: true })

  return {
    preTicket,
    messages: messages || []
  }
}

function getStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    finalized: 'bg-green-100 text-green-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getUrgencyColor(urgency) {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }
  return colors[urgency] || 'bg-gray-100 text-gray-800'
}

export default async function PreTicketPage({ params }) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  const data = await getPreTicket(params.id, tenant.id)

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pre-ticket not found</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-900">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { preTicket, messages } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                <h1 className="text-lg sm:text-xl font-semibold">Tenant Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
          >
            ← Back to dashboard
          </Link>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {preTicket.category.charAt(0).toUpperCase() + preTicket.category.slice(1)} Defect
                </h2>
                {preTicket.location_details && (
                  <p className="text-gray-600">Location: {preTicket.location_details}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getStatusColor(
                    preTicket.status
                  )}`}
                >
                  {preTicket.status.replace('_', ' ')}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${getUrgencyColor(
                    preTicket.urgency
                  )}`}
                >
                  {preTicket.urgency} urgency
                </span>
              </div>
            </div>

            <div className="prose max-w-none mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{preTicket.description}</p>
            </div>

            {/* Images */}
            {preTicket.images && preTicket.images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {preTicket.images.map((image, index) => (
                    <a
                      key={index}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md hover:opacity-80 transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI Answers */}
            {preTicket.ai_answers && Object.keys(preTicket.ai_answers).length > 0 && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-md">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">Additional Information</h3>
                <div className="space-y-3">
                  {Object.entries(preTicket.ai_answers).map(([question, answer], index) => (
                    answer && (
                      <div key={index}>
                        <p className="text-sm font-medium text-gray-700 mb-1">{question}</p>
                        <p className="text-sm text-gray-600">{answer}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(preTicket.created_at).toLocaleString()}
                  </dd>
                </div>
                {preTicket.finalized_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Finalized</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(preTicket.finalized_at).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Message Thread */}
          <PreTicketThread preTicketId={preTicket.id} initialMessages={messages} isFinalized={preTicket.status === 'finalized'} />
        </div>
      </main>
    </div>
  )
}
