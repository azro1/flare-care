'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Helper function to clear user-specific localStorage data
  const clearUserData = () => {
    if (typeof window === 'undefined') return
    
    // List of all user-specific localStorage keys to clear
    const keysToRemove = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('flarecare-symptoms') ||
        key.startsWith('flarecare-medications') ||
        key.startsWith('flarecare-medication-') ||
        key.startsWith('flarecare-symptom-') ||
        key.startsWith('flarecare-tracked-medication-') ||
        key.startsWith('symptoms-wizard-') ||
        key.startsWith('medication-wizard-') ||
        key === 'flarecare-user-preferences' ||
        key === 'flarecare-sync-enabled'
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  useEffect(() => {
    let previousUserId = null

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userData = session?.user ?? null
      
      // If user changed, clear previous user's data
      if (previousUserId && userData && previousUserId !== userData.id) {
        clearUserData()
      }
      
      // If logging out, clear all user data
      if (!userData && previousUserId) {
        clearUserData()
      }
      
      previousUserId = userData?.id || null
      setUser(userData)
      setIsAuthenticated(!!userData)
      setLoading(false)
      
      // Store/remove user data in localStorage
      if (userData) {
        localStorage.setItem('supabase.auth.user', JSON.stringify(userData))
      } else {
        localStorage.removeItem('supabase.auth.user')
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const userData = session?.user ?? null
        
        // Get current user ID before updating
        const currentUserId = user?.id || null
        const newUserId = userData?.id || null
        
        // If user changed (login or switch), clear previous user's data
        if (currentUserId && newUserId && currentUserId !== newUserId) {
          clearUserData()
        }
        
        // If logging out, clear all user data
        if (!userData && currentUserId) {
          clearUserData()
        }
        
        setUser(userData)
        setIsAuthenticated(!!userData)
        setLoading(false)
        
        // Store/remove user data in localStorage
        if (userData) {
          localStorage.setItem('supabase.auth.user', JSON.stringify(userData))
        } else {
          localStorage.removeItem('supabase.auth.user')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [user?.id])

  // Sign in with email OTP
  const signInWithOtp = async (email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  }

  // Delete user account and all associated data
  const deleteUser = async () => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      // Call RPC function to delete all user data and auth account
      const { error } = await supabase.rpc('delete_user_account')
      
      if (error) {
        console.error('Error deleting user account:', error)
        return { success: false, error: error.message }
      }

      // Set toast flag before clearing data
      localStorage.setItem('showAccountDeletedToast', 'true')
      
      // Clear localStorage
      clearUserData()
      localStorage.removeItem('supabase.auth.user')
      // Re-set toast flag after clearUserData (in case it was cleared)
      localStorage.setItem('showAccountDeletedToast', 'true')

      // Sign out (this will also clear the session)
      await signOut()

      return { success: true }
    } catch (error) {
      console.error('Error deleting user account:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    signInWithOtp,
    signOut,
    deleteUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
