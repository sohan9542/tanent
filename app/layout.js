import './globals.css'
import SiteFooter from './components/site-footer'

export const metadata = {
  title: 'Tenant Management System',
  description: 'Tenant and ticket management system',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <main className="pb-24">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}


