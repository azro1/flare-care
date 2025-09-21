'use client'

import { useAuth } from '../lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] sm:h-[calc(100vh-250px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to auth page
  }

  return children
}
