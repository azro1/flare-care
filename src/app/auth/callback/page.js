'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setError('Authentication failed. Please try again.')
          setLoading(false)
          return
        }

        if (data.session) {
          // User is authenticated, redirect to app
          setTimeout(() => {
            router.push('/')
          }, 500)
        } else {
          // No session, redirect to login
          router.push('/auth')
        }
      } catch (err) {
        setError('An error occurred during authentication.')
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'var(--bg-main)'}}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#5F9EA0] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-primary">Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => router.push('/auth')}
            className="bg-[#5F9EA0] text-white px-4 py-2 rounded hover:bg-[#5F9EA0]/80"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
