'use client'

import { useAuth } from '@/lib/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MainContent from '@/components/MainContent'

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navigation />
      <div className="flex-grow flex flex-col">
        <MainContent>{children}</MainContent>
      </div>
      <Footer />
    </div>
  )
}
