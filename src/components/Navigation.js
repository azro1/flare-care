'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import SyncSettings from './SyncSettings'
import { Sandwich } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
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

  // Get user's avatar from Google metadata
  const getUserAvatar = () => {
    if (!user) return null
    
    // Get avatar from user metadata (Google OAuth)
    const avatarUrl = user.user_metadata?.avatar_url || null
    
    // If it's a Google avatar, try to get a higher resolution version
    if (avatarUrl && avatarUrl.includes('googleusercontent.com')) {
      // Replace =s96-c with =s128-c for higher resolution
      return avatarUrl.replace('=s96-c', '=s128-c')
    }
    
    return avatarUrl
  }

  // Get user's initials for fallback
  const getUserInitials = () => {
    const displayName = getUserDisplayName()
    if (!displayName) return 'U'
    
    const names = displayName.trim().split(' ')
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase()
    }
    return displayName[0].toUpperCase()
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
    { 
      href: '/', 
      label: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      href: '/about', 
      label: 'About', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      href: '/ibd', 
      label: 'IBD', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      href: '/food-guide', 
      label: 'Foods', 
      icon: <Sandwich className="w-5 h-5" />
    },
  ]

  const unauthenticatedNavItems = [
    { 
      href: '/', 
      label: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      href: '/about', 
      label: 'About', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      href: '/ibd', 
      label: 'IBD', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      href: '/food-guide', 
      label: 'Foods', 
      icon: <Sandwich className="w-5 h-5" />
    },
  ]

  const featureNavItems = [
    { 
      href: '/symptoms', 
      label: 'Symptoms', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/medications', 
      label: 'Medications', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    { 
      href: '/reports', 
      label: 'Reports', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ]

  return (
    <nav className="bg-white/90 shadow-md border-b border-white/20 sticky top-0 z-50" style={{backdropFilter: 'blur(12px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'}}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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

            
            {/* User menu for authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center space-x-6 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-4">
                  {/* User Avatar with Dropdown */}
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-200 flex items-center justify-center hover:border-blue-300 transition-colors">
                    {getUserAvatar() ? (
                      <img 
                        src={getUserAvatar()} 
                        alt="User avatar" 
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => {
                          // Hide the image and show initials instead
                          e.target.style.display = 'none'
                          const container = e.target.parentElement
                          const initials = document.createElement('div')
                          initials.className = 'w-full h-full flex items-center justify-center text-gray-600 font-semibold text-sm'
                          initials.textContent = getUserInitials()
                          container.appendChild(initials)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                        {getUserInitials()}
                      </div>
                    )}
                    </div>
                    
                    {/* User Dropdown Menu */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        <Link
                          href="/account"
                          className="block px-4 py-3 text-base font-roboto transition-colors text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          Account
                        </Link>
                        <Link
                          href="/profile-settings"
                          className="block px-4 py-3 text-base font-roboto transition-colors text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          Profile Settings
                        </Link>
                      </div>
                    </div>
                  </div>
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
              {[...(isAuthenticated ? mainNavItems : unauthenticatedNavItems)].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-base font-medium font-roboto transition-colors duration-150 ${
                    pathname === item.href
                      ? 'text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon && <div className="text-gray-600">{item.icon}</div>}
                  <span>{item.label}</span>
                </Link>
              ))}
            
            {/* Mobile user section for authenticated users */}
            {isAuthenticated && (
              <div className="border-t border-gray-200/50 mt-4 pt-4">
                <div className="flex items-center px-4 py-3">
                  {/* User Avatar - Clickable */}
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 mr-3 bg-gray-200 flex items-center justify-center hover:border-blue-300 transition-colors"
                  >
                    {getUserAvatar() ? (
                      <img 
                        src={getUserAvatar()} 
                        alt="User avatar" 
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => {
                          // Hide the image and show initials instead
                          e.target.style.display = 'none'
                          const container = e.target.parentElement
                          const initials = document.createElement('div')
                          initials.className = 'w-full h-full flex items-center justify-center text-gray-600 font-semibold text-sm'
                          initials.textContent = getUserInitials()
                          container.appendChild(initials)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                        {getUserInitials()}
                      </div>
                    )}
                  </button>
                  {/* User Name */}
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-600 font-roboto">
                      {getUserDisplayName()}
                    </p>
                  </div>
                </div>
                
                {/* Mobile User Menu Options - Conditionally shown */}
                {isUserMenuOpen && (
                  <div className="px-4 pb-3">
                    <Link
                      href="/account"
                      className="block px-4 py-3 text-base font-roboto transition-colors text-gray-600 hover:bg-gray-50 rounded-lg"
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsUserMenuOpen(false)
                      }}
                    >
                      Account
                    </Link>
                    <Link
                      href="/profile-settings"
                      className="block px-4 py-3 text-base font-roboto transition-colors text-gray-600 hover:bg-gray-50 rounded-lg"
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsUserMenuOpen(false)
                      }}
                    >
                      Profile Settings
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
