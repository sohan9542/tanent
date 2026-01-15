import { redirect } from 'next/navigation'

export default function PreTicketPage({ params }) {
  redirect(`/tickets/${params.id}`)
}
