export const metadata = {
  title: 'Imprint | Tenant Management System',
  description: 'Legal information and company details',
}

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Imprint</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Company Information
              </h2>
              <div className="space-y-2">
                <p>
                  <strong>Legal Name:</strong> DLC Ingenieurs- & Planungsgesellschaft mbH
                </p>
                <p>
                  <strong>Address:</strong> Bergstraße 4, 63863 Eschau, Germany
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Contact Information
              </h2>
              <div className="space-y-2">
                <p>
                  <strong>Website:</strong>{' '}
                  <a
                    href="https://www.dlc-gmbh.eu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    www.dlc-gmbh.eu
                  </a>
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:info@dlc-gmbh.eu"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    info@dlc-gmbh.eu
                  </a>
                </p>
                <p>
                  <strong>Phone:</strong>{' '}
                  <a
                    href="tel:+4969247471340"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    069-24747134-0
                  </a>
                </p>
                <p>
                  <strong>Fax:</strong> 069-24747134-9
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Legal Information
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  This website is operated by DLC Ingenieurs- & Planungsgesellschaft mbH.
                  All content and information provided on this website is subject to German law.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

