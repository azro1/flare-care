'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../lib/ToastContext'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { addToast } = useToast()

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
          // User is authenticated, show success toast and redirect to app
          addToast('Successfully signed in!', 'success')
          router.push('/')
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
      <div className="flex items-center justify-center min-h-[350px] sm:h-[calc(100vh-250px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[350px] sm:h-[calc(100vh-250px)]">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
