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

  return (
    <footer className="py-6 sm:py-8 lg:py-12 px-4 sm:px-6 bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto">
        {/* Mobile minimal footer */}
        <div className="lg:hidden">
          <div className="flex items-center justify-center">
            <span className="text-sm text-slate-600">© 2025 FlareCare</span>
          </div>
        </div>

        {/* Desktop full footer */}
        <div className="hidden lg:flex lg:flex-col">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="font-bold font-source text-lg text-slate-900">FlareCare</span>
            </div>

            <div className="flex gap-8 text-sm text-slate-600">
              <a href="/about" className="hover:text-slate-900 transition-colors">About</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            Made with care for the IBD community
          </div>
        </div>
      </div>
    </footer>
  )
}
