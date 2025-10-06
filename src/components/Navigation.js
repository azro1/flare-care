'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import SyncSettings from './SyncSettings'

export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()

  // Get user's display name from Google metadata or fallback to email
  const getUserDisplayName = () => {
    if (!user) return ''
    
    // Try to get name from user metadata (Google OAuth)
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.user_metadata?.display_name
    
    if (fullName) return fullName
    
    // Fallback to email if no name is available
    return user.email || ''
  }


  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('nav')) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

  const mainNavItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/food-guide', label: 'Foods' },
  ]

  const unauthenticatedNavItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/learn', label: 'Learn' },
    { href: '/food-guide', label: 'Foods' },
  ]

  const featureNavItems = [
    { href: '/symptoms', label: 'Symptoms', icon: '📊' },
    { href: '/medications', label: 'Medications', icon: '💊' },
    { href: '/reports', label: 'Reports', icon: '📋' },
  ]

  return (
    <nav className="bg-white/90 shadow-md border-b border-white/20 sticky top-0 z-50" style={{backdropFilter: 'blur(12px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'}}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg lg:group-hover:scale-110">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="hidden sm:block text-base sm:text-lg lg:text-xl font-bold font-source text-slate-900">FlareCare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Main Navigation */}
            <div className="flex items-center space-x-6">
              {(isAuthenticated ? mainNavItems : unauthenticatedNavItems).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${
                    pathname === item.href
                      ? 'nav-link-active'
                      : 'nav-link-inactive'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Health Tools Dropdown - Only show when authenticated */}
            {isAuthenticated && (
              <div className="relative group">
                <button className="nav-link nav-link-inactive flex items-center gap-1">
                  Track
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {featureNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 text-base font-roboto transition-colors ${
                          pathname === item.href
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* User menu for authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center space-x-6 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-6">
                  <span className="text-base text-gray-600 font-medium font-roboto">
                    Hi, {getUserDisplayName()}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="nav-link nav-link-inactive bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 sm:p-3 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 active:scale-95"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200/50 transition-all duration-300 ease-out overflow-hidden ${
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              {/* All Navigation Links */}
              {[...(isAuthenticated ? mainNavItems : unauthenticatedNavItems), ...(isAuthenticated ? featureNavItems : [])].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 text-base font-medium font-roboto transition-colors duration-150 ${
                    pathname === item.href
                      ? 'text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            
            {/* Mobile sign out button for authenticated users */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-3 text-base font-medium font-roboto transition-colors duration-150 text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
