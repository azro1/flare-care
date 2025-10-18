'use client'

import { useAuth } from '@/lib/AuthContext'
import { usePathname } from 'next/navigation'

export default function MainContent({ children }) {
  return (
    <main className="flex-grow flex flex-col container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {children}
    </main>
  )
}
