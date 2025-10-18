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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userData = session?.user ?? null
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
  }, [])

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

  const value = {
    user,
    isAuthenticated,
    loading,
    signInWithOtp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
