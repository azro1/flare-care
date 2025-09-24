'use client'

import { useAuth } from '@/lib/AuthContext'
import { usePathname } from 'next/navigation'

export default function MainContent({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const pathname = usePathname()
  
  // Pages that should have minimal footer (which is fixed)
  const minimalFooterPages = ['/auth', '/auth/callback']
  const isMinimalFooter = minimalFooterPages.includes(pathname) || (loading || !isAuthenticated)
  
  // Add bottom padding when footer is fixed
  const bottomPadding = isMinimalFooter ? 'pb-32' : ''
  
  return (
    <main className={`flex-grow flex flex-col container mx-auto px-4 py-12 ${bottomPadding}`}>
      {children}
    </main>
  )
}
