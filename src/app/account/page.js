'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Settings, LogOut, Trash2, User } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'
import { isPushSupported, subscribeForPush, subscriptionToPayload, savePushSubscriptionToServer } from '@/lib/pushSubscription'

function AccountPageContent() {
  const { user, signOut, deleteUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFallbackAvatar, setShowFallbackAvatar] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [pushEnabling, setPushEnabling] = useState(false)
  const [pushStatus, setPushStatus] = useState(null) // 'enabled' | 'unsupported' | null

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

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    setShowDeleteModal(false)
    
    try {
      const result = await deleteUser()
      
      if (result.success) {
        // Account deleted successfully, redirect to landing page
        router.replace('/')
      } else {
        // Show error and reopen modal
        setDeleteError(result.error || 'Failed to delete account')
        setShowDeleteModal(true)
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setDeleteError(error.message || 'An unexpected error occurred')
      setShowDeleteModal(true)
      setIsDeleting(false)
    }
  }

  // Get user's avatar from Google metadata (same as navigation)
  const getUserAvatar = () => {
    if (!user) return null
    
    const avatarUrl = user.user_metadata?.avatar_url || null
    
    if (avatarUrl && avatarUrl.includes('googleusercontent.com')) {
      return avatarUrl.replace('=s96-c', '=s128-c')
    }
    
    return avatarUrl
  }

  const avatarUrl = getUserAvatar()

  const handleEnablePush = async () => {
    if (!user?.id || !isPushSupported()) return
    setPushEnabling(true)
    setPushStatus(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Push enable failed: no session')
        setPushEnabling(false)
        return
      }
      const sub = await subscribeForPush()
      if (!sub) {
        setPushEnabling(false)
        return
      }
      const payload = subscriptionToPayload(sub)
      await savePushSubscriptionToServer(payload, session.access_token)
      setPushStatus('enabled')
    } catch (e) {
      console.error('Push enable failed:', e)
    }
    setPushEnabling(false)
  }

  useEffect(() => {
    setShowFallbackAvatar(false)
  }, [avatarUrl])

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
      <div className="max-w-6xl mx-auto sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5 sm:mb-6 card">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">My Account</h1>
            <p className="text-secondary font-roboto break-words">Manage your account settings and information</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Profile Section */}
            <div className="card mb-5 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8 card-inner p-4 sm:p-6">
                <div className="flex items-center min-w-0">
                  <div className={`mr-4 sm:mr-6 flex-shrink-0 rounded-full p-0.5 ${avatarUrl && !showFallbackAvatar ? 'border-2 border-[var(--border-dropdown)]' : ''}`}>
                    <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-icon)] dark:bg-[var(--bg-icon-charcoal)]">
                      {avatarUrl && !showFallbackAvatar ? (
                        <img
                          src={avatarUrl}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'crisp-edges' }}
                          onError={() => setShowFallbackAvatar(true)}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full rounded-full bg-[var(--bg-card)] dark:bg-[var(--bg-card)]">
                          <Image
                            src="/icons/person.svg"
                            alt="User avatar placeholder"
                            width={28}
                            height={28}
                            className="w-6 h-6 sm:w-7 sm:h-7 opacity-95 dark:opacity-90"
                            priority
                          />
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
                  className="bg-[#5F9EA0] text-white font-semibold py-2 px-4 rounded-lg border border-transparent hover:bg-button-cadet-hover transition-colors disabled:opacity-50 self-start sm:self-auto inline-flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 dark:text-white" />
                  Sign Out
                </button>
              </div>

              {/* Profile Info */}
              <h3 className="text-lg sm:text-xl font-semibold font-source text-primary mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#5F9EA0] dark:text-white" />
                Profile Info
              </h3>
              <div className="space-y-4">
                <div className="card-inner p-4 sm:p-6">
                  <p className="text-sm font-medium text-secondary mb-1">Email</p>
                  <p className="text-primary font-roboto break-words">{user?.email || 'Not available'}</p>
                </div>
                <div className="card-inner p-4 sm:p-6">
                  <p className="text-sm font-medium text-secondary mb-1">Full Name</p>
                  <p className="text-primary font-roboto">{user?.user_metadata?.full_name || 'Not set'}</p>
                </div>
                <div className="card-inner p-4 sm:p-6">
                  <p className="text-sm font-medium text-secondary mb-1">Account Created</p>
                  <p className="text-primary font-roboto">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Not available'}
                  </p>
                </div>
                <div className="card-inner p-4 sm:p-6">
                  <p className="text-sm font-medium text-secondary mb-1">User ID</p>
                  <p className="text-primary font-roboto font-mono text-sm break-all">{user?.id || 'Not available'}</p>
                </div>
              </div>
            </div>

            {/* Settings – mobile only: above Delete Account */}
            <div className="card mb-5 sm:mb-6 lg:hidden">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-[#5F9EA0] dark:text-white" />
                <h3 className="text-lg sm:text-xl font-semibold font-source text-primary">Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="card-inner p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary mb-1">Appearance</p>
                    <p className="text-primary font-roboto">
                      {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                    </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                    className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none"
                    style={{
                      backgroundColor: theme === 'dark' ? '#5F9EA0' : '#cbd5e1'
                    }}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                    <span className="sr-only">Toggle theme</span>
                    </button>
                  </div>
                </div>
                {isPushSupported() && (
                  <div className="card-inner p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary mb-1">Push notifications</p>
                      <p className="text-primary font-roboto">
                        {pushStatus === 'enabled' ? 'Enabled – you’ll get reminders when the app is closed' : 'Get medication reminders even when the app is closed'}
                      </p>
                    </div>
                    {pushStatus !== 'enabled' && (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        disabled={pushEnabling}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 shrink-0"
                        style={{ backgroundColor: '#5F9EA0' }}
                      >
                        {pushEnabling ? 'Enabling…' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="card">
              <div className="border-l-4 border-red-500 pl-4 mb-6">
                <h3 className="text-lg sm:text-xl font-semibold font-source text-primary mb-2">Delete Account</h3>
                <p className="text-secondary font-roboto mb-4">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="button-delete inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 dark:text-white" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar – Settings: desktop only */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="card lg:sticky lg:top-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-[#5F9EA0] dark:text-white" />
                <h3 className="text-lg sm:text-xl font-semibold font-source text-primary">Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="card-inner p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary mb-1">Appearance</p>
                    <p className="text-primary font-roboto">
                      {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                    </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                    className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none"
                    style={{
                      backgroundColor: theme === 'dark' ? '#5F9EA0' : '#cbd5e1'
                    }}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                    <span className="sr-only">Toggle theme</span>
                    </button>
                  </div>
                </div>
                {isPushSupported() && (
                  <div className="card-inner p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary mb-1">Push notifications</p>
                      <p className="text-primary font-roboto">
                        {pushStatus === 'enabled' ? 'Enabled – you’ll get reminders when the app is closed' : 'Get medication reminders even when the app is closed'}
                      </p>
                    </div>
                    {pushStatus !== 'enabled' && (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        disabled={pushEnabling}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 shrink-0"
                        style={{ backgroundColor: '#5F9EA0' }}
                      >
                        {pushEnabling ? 'Enabling…' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-md mx-4 border" style={{backgroundColor: 'var(--bg-dropdown)', borderColor: 'var(--border-dropdown)'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#5F9EA0]/20 dark:bg-[#5F9EA0]/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5F9EA0] dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="rounded-xl p-6 max-w-md mx-4 border" style={{backgroundColor: 'var(--bg-dropdown)', borderColor: 'var(--border-dropdown)'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Delete Account</h3>
            </div>
            
            <p className="text-secondary mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{deleteError}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="flex-1 button-cancel disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="button-delete flex-1 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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
