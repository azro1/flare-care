'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/AuthContext'
import CrohnsColitisLogo from './CrohnsColitisLogo'

export default function Footer() {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  
  // Pages that should have minimal footer
  const minimalFooterPages = ['/auth', '/auth/callback']
  const isMinimalFooter = minimalFooterPages.includes(pathname) || (loading || !isAuthenticated)
  
  // Minimal footer for auth and landing pages
  if (isMinimalFooter) {
    return (
      <footer className="bg-white border-t border-gray-200 py-6 fixed bottom-0 w-full z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center lg:justify-between gap-3">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  &copy; 2025 FlareCare.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm text-gray-500">Supporting</span>
                <CrohnsColitisLogo size="xs" showText={false} />
                <span className="text-sm text-gray-600">Crohn's & Colitis UK</span>
              </div>
            </div>
        </div>
      </footer>
    )
  }
  
  // Full footer for main content pages
  return (
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
        
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                &copy; 2025 FlareCare
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-center">
              <span className="text-sm text-gray-500">Supporting</span>
              <CrohnsColitisLogo size="sm" showText={true} />
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500">
            Built with care for Crohn's & Colitis patients
          </p>
        </div>
      </div>
    </footer>
  )
}
