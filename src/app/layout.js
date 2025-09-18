import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata = {
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="%232563eb" rx="4"/><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" fill="white" stroke="white" stroke-width="0.5"/></svg>',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-12">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center text-center md:grid md:grid-cols-2 md:gap-8 md:items-start md:text-left lg:flex lg:flex-row lg:justify-between gap-8 mb-8">
                
                <div className="md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-2">Track</h3>
                  <ul className="space-y-2">
                    <li><a href="/symptoms" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Symptoms</a></li>
                    <li><a href="/medications" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Medications</a></li>
                    <li><a href="/reports" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Reports</a></li>
                  </ul>
                </div>
                
                <div className="md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <ul className="space-y-2">
                    <li><a href="/about" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">About Us</a></li>
                    <li><a href="/" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Home</a></li>
                  </ul>
                </div>
                
                <div className="md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
                  <ul className="space-y-2">
                    <li><a href="mailto:support@flarecare.app" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Contact</a></li>
                    <li><span className="text-sm text-gray-500">Blog (Coming Soon)</span></li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 text-center flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">
                      &copy; 2025 FlareCare. <span className="hidden lg:inline">Built with care for Crohn's & Colitis patients.</span>
                    </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
