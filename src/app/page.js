import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="mb-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FlareCare
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Your personal companion for managing Crohn's & Colitis symptoms
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          Track your symptoms, manage medications, and generate detailed reports to help you and your healthcare team make informed decisions.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Link href="/symptoms" className="group">
          <div className="card h-64 hover:shadow-lg transition-shadow duration-200 group-hover:border-primary-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Symptoms</h3>
              <p className="text-gray-600">Track your daily symptoms, severity, and triggers to identify patterns.</p>
            </div>
          </div>
        </Link>

        <Link href="/medications" className="group">
          <div className="card h-64 hover:shadow-lg transition-shadow duration-200 group-hover:border-primary-300">
            <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Medications</h3>
              <p className="text-gray-600">Manage your medication schedule and track adherence.</p>
            </div>
          </div>
        </Link>

        <Link href="/reports" className="group">
          <div className="card h-64 hover:shadow-lg transition-shadow duration-200 group-hover:border-primary-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reports</h3>
              <p className="text-gray-600">Generate detailed reports and export data for your healthcare team.</p>
            </div>
          </div>
        </Link>
      </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 pb-10">
            <h2 className="text-lg font-semibold text-primary-900 mb-3">Ready to take control? 🚀</h2>
            <p className="text-primary-700 mb-8">
              Every journey begins with a single step. Start by logging your first symptom entry - 
              it only takes a minute, but the insights you'll gain are priceless. 
              Your future self will thank you for the data you collect today.
            </p>
            <Link href="/symptoms" className="btn-primary">
              Start Your Journey
            </Link>
          </div>
    </div>
  )
}
