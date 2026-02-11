'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MainContent from '@/components/MainContent'
import AppNavSignedIn from '@/components/AppNavSignedIn'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const isAuthPage = pathname === '/auth'
  const showWebNavAndFooter = !isAuthPage && !isAuthenticated
  const signedIn = !isAuthPage && isAuthenticated

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Signed out: full nav + footer. Signed in + desktop: same nav + footer (hidden on mobile) */}
      {showWebNavAndFooter && <Navigation />}
      {signedIn && (
        <div className="hidden md:block">
          <Navigation />
        </div>
      )}
      {/* Signed in + mobile: bottom tab bar only */}
      {signedIn && <AppNavSignedIn />}
      {signedIn ? (
        <div className="flex-grow flex flex-col pb-20 md:pb-0">
          <MainContent>{children}</MainContent>
        </div>
      ) : (
        <MainContent>{children}</MainContent>
      )}
      {showWebNavAndFooter && <Footer />}
      {signedIn && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
    </div>
  )
}
