'use client'

import { useAuth } from '@/lib/AuthContext'

export default function LoadingScreen({ children }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5F9EA0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return children
}
