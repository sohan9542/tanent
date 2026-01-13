export const metadata = {
  title: 'Privacy Policy | Tenant Management System',
  description: 'Privacy policy and data protection information',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. Introduction
              </h2>
              <p className="text-gray-600">
                [Placeholder text - Please insert your privacy policy content here]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. Data Collection
              </h2>
              <p className="text-gray-600">
                [Placeholder text - Please insert information about data collection practices]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. Data Usage
              </h2>
              <p className="text-gray-600">
                [Placeholder text - Please insert information about how data is used]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Data Protection
              </h2>
              <p className="text-gray-600">
                [Placeholder text - Please insert information about data protection measures]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. Your Rights
              </h2>
              <p className="text-gray-600">
                [Placeholder text - Please insert information about user rights under GDPR]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                6. Contact
              </h2>
              <p className="text-gray-600">
                For questions regarding data protection, please contact:{' '}
                <a
                  href="mailto:info@dlc-gmbh.eu"
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  info@dlc-gmbh.eu
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

