'use client'

import { useAuth } from '@/lib/AuthContext'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function MainContent({ children }) {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  
  // Apply dark background to body for all pages
  useEffect(() => {
    const body = document.getElementById('body')
    body.style.background = 'var(--bg-main-gradient)'
  }, [pathname, isAuthenticated, loading])

  // Immediately hide all content when navigating to reports to prevent flash
  // This runs BEFORE any page component mounts, preventing any cached content from showing
  useEffect(() => {
    if (pathname === '/reports') {
      // Hide main content immediately when route changes to reports
      const main = document.querySelector('main')
      if (main) {
        main.style.visibility = 'hidden'
        main.style.opacity = '0'
        main.style.pointerEvents = 'none'
      }
    } else {
      // Restore visibility for other pages
      const main = document.querySelector('main')
      if (main) {
        main.style.visibility = ''
        main.style.opacity = ''
        main.style.pointerEvents = ''
      }
    }
  }, [pathname])

  // For landing page, don't constrain width
  if (pathname === '/' && !isAuthenticated && !loading) {
    return (
      <main className="flex-grow flex flex-col">
        {children}
      </main>
    )
  }

  // For all other pages, use the normal container
  return (
    <main className="flex-grow flex flex-col container mx-auto px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
      {children}
    </main>
  )
}
