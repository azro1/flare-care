'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const { data: symptoms } = useDataSync('flarecare-symptoms', [])
  const router = useRouter()
  const [showAllSymptoms, setShowAllSymptoms] = useState(false)

  // Prevent body scrolling when not authenticated
  // useEffect(() => {
  //   if (!isAuthenticated && !loading) {
  //     // Mobile-friendly approach
  //     document.body.style.position = 'fixed'
  //     document.body.style.width = '100%'
  //     document.body.style.height = '100%'
  //   } else {
  //     document.body.style.position = 'static'
  //     document.body.style.width = 'auto'
  //     document.body.style.height = 'auto'
  //   }
    
  //   // Cleanup on unmount
  //   return () => {
  //     document.body.style.position = 'static'
  //     document.body.style.width = 'auto'
  //     document.body.style.height = 'auto'
  //   }
  // }, [isAuthenticated, loading])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show a compelling landing page
  if (!isAuthenticated) {
    return (
      <div className="sm:flex-grow flex flex-col items-center justify-center" style={{
        background: 'radial-gradient(ellipse at center, rgba(240, 249, 255, 0.3) 0%, rgba(224, 242, 254, 0.2) 40%, rgba(255, 255, 255, 0.1) 70%, transparent 100%)'
      }}>
        {/* Hero Section */}
        <div className="relative">
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
            <div className="text-center">
              {/* Brand Name */}
              <div className="mb-2">
                <h2 className="text-2xl font-bold font-source text-blue-600 mb-2">FlareCare</h2>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-source text-slate-900">
                Take Control of Your
                <span className="block my-2">
                   <span className="text-blue-600">IBD</span> Journey
                </span>
              </h1>

              {/* Features */}
              <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Track Symptoms</h3>
                    <p className="text-slate-600">Log daily symptoms and identify patterns over time</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Manage Medications</h3>
                    <p className="text-slate-600">Set reminders and track medication adherence</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Generate Reports</h3>
                    <p className="text-slate-600">Create detailed reports for your healthcare team</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <Link href="/auth" className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-6 py-3 rounded-xl transition-colors duration-200">
                    <span>Get Started</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
            </div>
          </div>
        </div>

      </div>
    )
  }
  // Get symptoms to display (1 by default, all if expanded)
  const displayedSymptoms = showAllSymptoms ? symptoms : symptoms.slice(0, 1)
  const todaySymptoms = symptoms.filter(symptom => {
    const today = new Date().toDateString()
    const symptomDate = new Date(symptom.created_at || symptom.createdAt).toDateString()
    return today === symptomDate
  })

  return (
    <div className="bg-gray-50">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:justify-center">
          
          {/* Left Sidebar */}
          <div className="lg:w-72 lg:flex-shrink-0 order-2 lg:order-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Quick Stats */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold font-source text-gray-900 mb-4">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Symptoms</span>
                    <span className="font-semibold text-gray-900">{symptoms.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-semibold text-gray-900">
                      {symptoms.filter(s => {
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return new Date(s.created_at || s.createdAt) > weekAgo
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Today</span>
                    <span className="font-semibold text-gray-900">{todaySymptoms.length}</span>
                  </div>
                </div>
              </div>

              {/* Today's Goals */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold font-source text-gray-900 mb-4">Today's Goals</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      todaySymptoms.length > 0 
                        ? 'bg-emerald-100' 
                        : 'bg-emerald-100'
                    }`}>
                      <svg className={`w-3 h-3 ${todaySymptoms.length > 0 ? 'text-emerald-600' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-sm ${todaySymptoms.length > 0 ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>
                        Log symptoms
                      </span>
                      {todaySymptoms.length > 0 && (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">Take medications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">Stay hydrated</span>
                  </div>
                </div>
              </div>

              {/* Daily Tip */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                <h3 className="text-lg font-semibold font-source text-blue-900 mb-2">💡 Daily Tip</h3>
                <p className="text-sm text-blue-800">
                  {new Date().getDay() === 1 ? "Start your week with a symptom check-in to track any weekend changes." :
                   new Date().getDay() === 5 ? "Weekend approaching! Log any stress or dietary changes that might affect your symptoms." :
                   "Keep a consistent sleep schedule - it can help reduce IBD flare-ups."}
                </p>
              </div>

            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:max-w-4xl order-1 lg:order-2">
        {/* Greeting */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">
            Hello, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-lg sm:text-xl font-roboto text-gray-600">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
      </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/symptoms" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Log Symptoms</h3>
            </div>
          </Link>

            <Link href="/medications" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Track Meds</h3>
            </div>
          </Link>

            <Link href="/reports" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Reports</h3>
              </div>
            </Link>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">Today's Summary</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Symptoms Logged</span>
              <span className="font-semibold text-gray-900">{todaySymptoms.length}</span>
            </div>
            <div className="border-t border-gray-200 my-2"></div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Medications Taken</span>
              <span className="font-semibold text-gray-900">0/0</span>
            </div>
          </div>
        </div>

        {/* Recent Symptoms */}
        {displayedSymptoms.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold font-source text-gray-900">Recent Symptoms</h2>
              {symptoms.length > 1 && (
                <button 
                  onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showAllSymptoms ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>
            <div className="space-y-3 max-w-xs">
              {displayedSymptoms.map((symptom) => (
                <div 
                  key={symptom.id} 
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200"
                  onClick={() => {
                    router.push(`/symptoms/${symptom.id}`)
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(symptom.created_at || symptom.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(symptom.created_at || symptom.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>Severity: {symptom.severity}/10</span>
                      <span>Stress: {symptom.stress_level}/10</span>
                    </div>
                    {symptom.notes && (
                      <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{symptom.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {symptoms.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">No recent activity</p>
                <p className="text-xs text-gray-500 mt-1">Start tracking your symptoms to see activity here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Most recent symptom entry */}
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Logged symptoms</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        const lastSymptom = symptoms[0]
                        const lastDate = new Date(lastSymptom.created_at || lastSymptom.createdAt)
                        const now = new Date()
                        const diffMinutes = Math.floor((now - lastDate) / (1000 * 60))
                        const diffHours = Math.floor(diffMinutes / 60)
                        
                        if (diffMinutes < 1) return 'Just now'
                        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
                        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                        const diffDays = Math.floor(diffHours / 24)
                        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
                        return lastDate.toLocaleDateString()
                      })()}
                    </p>
                  </div>
                </div>

                {/* Tracking streak */}
                {symptoms.length >= 3 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Completed {symptoms.length}-day tracking streak</p>
                      <p className="text-xs text-gray-500">Great consistency!</p>
                    </div>
                  </div>
                )}

                {/* Welcome message for new users */}
                {symptoms.length === 1 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Welcome to FlareCare!</p>
                      <p className="text-xs text-gray-500">You've logged your first symptom entry</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* More Options */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link href="/about" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">About</h3>
              </div>
            </Link>

            <Link href="/ibd" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">IBD</h3>
              </div>
            </Link>

            <Link href="/food-guide" className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Foods</h3>
              </div>
            </Link>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
