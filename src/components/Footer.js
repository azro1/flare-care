'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/AuthContext'

export default function Footer() {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  
  // Don't render footer during loading
  if (loading) {
    return null
  }
  
  
  // Full footer for authenticated users, minimal for unauthenticated
  if (isAuthenticated) {
    return (
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto lg:flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden lg:flex lg:flex-row lg:justify-between gap-8 mb-8">
            
            <div>
              <h3 className="font-semibold font-source text-gray-900 mb-2 text-xl">Track</h3>
              <ul className="space-y-2">
                <li><a href="/symptoms" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Symptoms</a></li>
                <li><a href="/medications" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Medications</a></li>
                <li><a href="/reports" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Reports</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold font-source text-gray-900 mb-2 text-xl">About</h3>
              <ul className="space-y-2">
                <li><a href="/" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Home</a></li>
                <li><a href="/about" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">About Us</a></li>
                <li><a href="/food-guide" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Foods</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold font-source text-gray-900 mb-2 text-xl">Support</h3>
              <ul className="space-y-2">
                <li><a href="mailto:support@flarecare.app" className="text-base text-gray-600 font-roboto hover:text-blue-600 transition-colors">Contact</a></li>
                <li><span className="text-base text-gray-500 font-roboto">Blog</span></li>
              </ul>
            </div>
          </div>
          
          <div className="hidden lg:block border-t border-gray-200 pt-8">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-2">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-lg text-gray-600 font-roboto">
                &copy; 2025 FlareCare
              </p>
            </div> 
          </div>
          
          {/* Minimal footer for mobile authenticated users */}
          <div className="lg:hidden">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-2">
                <div className="hidden sm:flex items-center justify-center w-9 h-9 bg-blue-700 rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-base text-gray-600 font-roboto">
                  &copy; 2025 FlareCare
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    )
  }
  
  // Minimal footer for unauthenticated users
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center lg:justify-between gap-3">
            <div className="flex items-center justify-center gap-2">
              <div className="hidden sm:flex items-center justify-center w-9 h-9 bg-blue-700 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-base text-gray-600 font-roboto">
                &copy; 2025 FlareCare
              </p>
            </div>
            <div className="hidden lg:flex flex-col items-start justify-center text-sm text-gray-600 font-roboto">
              <p>Terms of use</p>
              <p>Privacy policy</p>
            </div>
          </div>
      </div>
    </footer>
  )
}
