'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/AuthContext'
import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  const [scrollY, setScrollY] = useState(0)
  
  // Don't render footer during loading
  if (loading) {
    return null
  }

  // Check if we're on a page that needs fixed footer on mobile
  const needsFixedFooter = pathname === '/auth' || pathname === '/symptoms'

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      
      // If we're near the bottom (within 50px), keep it dark
      if (scrollY >= maxScroll - 50) {
        setScrollY(999) // Force dark background
      } else {
        setScrollY(scrollY)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  return (
    <footer className={`py-8 sm:py-8 lg:py-12 px-4 sm:px-6 mt-auto ${needsFixedFooter ? 'fixed bottom-0 left-0 right-0 lg:static' : ''}`} style={{backgroundColor: 'var(--bg-nav-footer)'}}>
      <div className="max-w-7xl mx-auto">
        {/* Mobile minimal footer */}
        <div className="lg:hidden">
          <div className="flex items-center justify-center">
            <span className="text-sm" style={{color: 'var(--text-footer)'}}>© 2025 FlareCare</span>
          </div>
        </div>

        {/* Desktop full footer */}
        <div className="hidden lg:flex lg:flex-col">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5F9EA0]">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold font-source text-lg" style={{color: 'var(--text-footer)'}}>FlareCare</span>
            </div>

            <div className="flex gap-8 text-sm text-slate-300">
              <a href="/about" className="transition-colors hover:text-[#5F9EA0]">About</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Privacy</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Terms</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Contact</a>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center text-sm text-slate-300" style={{borderTop: '1px solid var(--border-footer)'}}>
            Made with care for the IBD community
          </div>
        </div>
      </div>
    </footer>
  )
}
