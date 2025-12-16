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
  const is404 = typeof window !== 'undefined' && document.documentElement.classList.contains('is-404')
  const needsFixedFooter = pathname === '/auth' || pathname === '/symptoms' || pathname === '/medications/track' || is404

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
            <span style={{color: 'var(--text-footer)'}}>© 2025 FlareCare</span>
          </div>
        </div>

        {/* Desktop full footer */}
        <div className="hidden lg:flex lg:flex-col">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p style={{color: 'var(--text-footer)'}}>© FlareCare 2025. All rights reserved</p>
            <div className="flex gap-8 text-base" style={{color: 'var(--text-footer)'}}>
              <a href="/about" className="transition-colors hover:text-[#5F9EA0]">About</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Privacy</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Terms</a>
              <a href="#" className="transition-colors hover:text-[#5F9EA0]">Contact</a>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center text-sm" style={{borderTop: '1px solid var(--border-footer)', color: 'var(--text-footer)'}}>
            Made with <span className="text-lg">💜</span> for the IBD community 
          </div>
        </div>
      </div>
    </footer>
  )
}
