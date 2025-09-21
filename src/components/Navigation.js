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

  const navItems = [
    { href: '/', label: 'Home' },
        { href: '/symptoms', label: 'Symptoms' },
    { href: '/medications', label: 'Medications' },
    { href: '/reports', label: 'Reports' },
    { href: '/about', label: 'About' },
  ]

  return (
    <nav className="bg-white/90 shadow-lg border-b border-white/20 sticky top-0 z-50" style={{backdropFilter: 'blur(12px)'}}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg lg:group-hover:scale-110">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="hidden sm:block text-base sm:text-lg lg:text-xl font-bold text-slate-900">FlareCare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3">
            {navItems.map((item) => (
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
            
            {/* User menu for authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 text-sm font-medium">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-slate-700 font-medium hidden lg:block">{user?.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="nav-link nav-link-inactive bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800"
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
        <div className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200/50 transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}>
          <div className="py-4">
            <div className="space-y-2">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 text-base font-medium transition-all duration-200 transform lg:hover:scale-105 ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-blue-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: isMenuOpen ? 'fadeInDown 0.4s ease-out forwards' : 'none'
                  }}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile user menu for authenticated users */}
              {isAuthenticated && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="px-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 text-lg font-medium">
                          {user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 font-medium">{user?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        signOut()
                        setIsMenuOpen(false)
                      }}
                      className="block w-full px-4 py-3 text-base font-medium transition-all duration-200 transform bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
