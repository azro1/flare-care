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
    <main className="flex-grow flex flex-col container mx-auto px-4 pt-5 pb-7 sm:px-6 lg:px-8 sm:py-8">
      {children}
    </main>
  )
}
