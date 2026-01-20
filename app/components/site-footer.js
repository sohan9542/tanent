'use client'

import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Tenant Management System. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <Link
              href="/imprint"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Imprint
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

