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
    body.className = 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
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
    <main className="flex-grow flex flex-col container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {children}
    </main>
  )
}
