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
    <footer className="py-8 sm:py-8 lg:py-12 px-4 sm:px-6 mt-auto bg-transparent border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        {/* Mobile minimal footer */}
        <div className="lg:hidden">
          <div className="flex items-center justify-center">
            <span className="text-sm text-slate-400">© 2025 FlareCare</span>
          </div>
        </div>

        {/* Desktop full footer */}
        <div className="hidden lg:flex lg:flex-col">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5F9EA0]">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="font-bold font-source text-lg text-slate-300">FlareCare</span>
            </div>

            <div className="flex gap-8 text-sm text-slate-400">
              <a href="/about" className="transition-colors hover:text-[#5F9EA0]">About</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Privacy</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Terms</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Contact</a>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center text-sm border-t border-slate-800/50 text-slate-500">
            Made with care for the IBD community
          </div>
        </div>
      </div>
    </footer>
  )
}
