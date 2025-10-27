'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

function AccountPageContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setShowSignOutModal(false)
    
    // Immediately clear localStorage to prevent flash
    localStorage.removeItem('supabase.auth.user')
    
    try {
      await signOut()
      setIsSigningOut(false)
      router.replace('/')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  const handleDeleteAccount = () => {
    setShowDeleteModal(false)
    alert('Coming Soon: Account deletion will be available after we set up the Supabase integration.')
  }

  // Get user's avatar from Google metadata (same as navigation)
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

  // Get user initials for avatar fallback
  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U'
    if (name.includes(' ')) {
      const parts = name.split(' ')
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (isSigningOut) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#5F9EA0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary font-roboto">Signing out...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">Account</h1>
            <p className="text-secondary font-roboto break-words">Manage your account settings and information</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center min-w-0">
              <div className="mr-4 sm:mr-6 flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-700/50 flex items-center justify-center">
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
                        initials.className = 'w-full h-full flex items-center justify-center text-white text-2xl font-bold font-source bg-[#5F9EA0]'
                        initials.textContent = getInitials()
                        container.appendChild(initials)
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold font-source bg-[#5F9EA0]">
                      {getInitials()}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold font-source text-primary mb-1 truncate">
                  {user?.user_metadata?.full_name || 'User'}
                </h2>
                <p className="text-secondary font-roboto truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSignOutModal(true)}
              disabled={isSigningOut}
              className="bg-[#5F9EA0] text-white font-semibold py-2 px-4 rounded-lg hover:bg-button-cadet-hover transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Account Information */}
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold font-source text-primary mb-4">Account Information</h3>
          
          <div className="space-y-4">
            <div className="py-3 border-b border-slate-300/50 dark:border-slate-700/50">
              <p className="text-sm font-medium text-secondary mb-1">Email</p>
              <p className="text-primary font-roboto">{user?.email || 'Not available'}</p>
            </div>

            <div className="py-3 border-b border-slate-300/50 dark:border-slate-700/50">
              <p className="text-sm font-medium text-secondary mb-1">Full Name</p>
              <p className="text-primary font-roboto">{user?.user_metadata?.full_name || 'Not set'}</p>
            </div>

            <div className="py-3 border-b border-slate-300/50 dark:border-slate-700/50">
              <p className="text-sm font-medium text-secondary mb-1">Account Created</p>
              <p className="text-primary font-roboto">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Not available'}
              </p>
            </div>

            <div className="py-3">
              <p className="text-sm font-medium text-secondary mb-1">User ID</p>
              <p className="text-primary font-roboto text-sm font-mono">{user?.id || 'Not available'}</p>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="card p-6 mb-8">
          <div className="border-l-4 border-red-500 pl-4 mb-6">
            <h3 className="text-lg font-semibold font-source text-primary mb-2">Delete Account</h3>
            <p className="text-secondary font-roboto mb-4">
              Permanently delete your account and all associated data
            </p>
          </div>
          

          <div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500 text-white font-semibold py-3 px-8 rounded-xl hover:bg-red-400 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#5F9EA0]/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5F9EA0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Sign Out</h3>
            </div>
            
            <p className="text-secondary mb-6">
              Are you sure you want to sign out of your account?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="flex-1 button-cancel disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex-1 px-4 py-2 bg-[#5F9EA0] text-white hover:bg-button-cadet-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Delete Account</h3>
            </div>
            
            <p className="text-secondary mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="button-delete flex-1"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountPageContent />
    </ProtectedRoute>
  )
}
