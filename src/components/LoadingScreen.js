'use client'

import { useAuth } from '@/lib/AuthContext'

export default function LoadingScreen({ children }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--bg-main)'}}>
        <div className="w-8 h-8 border-4 border-[#5F9EA0] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    )
  }

  return children
}
