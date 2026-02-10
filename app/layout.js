import './globals.css'
import { CapmoPollProvider } from './contexts/capmo-poll-provider'

export const metadata = {
  title: 'Tenant Management System',
  description: 'Tenant and ticket management system',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CapmoPollProvider>
          {children}
        </CapmoPollProvider>
      </body>
    </html>
  )
}


