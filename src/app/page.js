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
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
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
      <div className="min-h-screen bg-white">
        {/* Global Navigation component is used via layout; removing inline landing nav to avoid duplicates */}

        <section className="pt-12 pb-16 sm:pb-20 px-6 sm:pt-32">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-3 sm:space-y-5">
              <div className="mb-0">
                <span className="text-lg sm:text-xl font-semibold text-blue-500">FlareCare</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight font-source">
                A clearer view of your <span className="text-blue-500">IBD</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                A personal health journal designed for people with Crohn's disease and ulcerative colitis.
                Track your symptoms, understand your patterns, and feel more in control.
              </p>

              <div className="pt-4">
                <Link href="/auth" className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-lg font-medium">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="mt-16 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 md:p-12 border border-slate-200">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Today's Check-in</h3>
                      <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-500 mb-1">Pain Level</div>
                      <div className="text-2xl font-semibold text-slate-900">2/10</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-500 mb-1">Energy</div>
                      <div className="text-2xl font-semibold text-slate-900">Good</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-500 mb-1">Meds Taken</div>
                      <div className="text-2xl font-semibold text-slate-900">3/3</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-2">Notes</div>
                    <p className="text-slate-700">Feeling better today. Avoided dairy and it seems to help.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16  sm:py-20 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-source text-slate-900 mb-4">
                Tools to help you manage your health
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Simple features that make a real difference in your daily life
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Track Your Days</h3>
                <p className="text-slate-600 leading-relaxed">Log symptoms, pain levels, and bowel movements with a simple daily journal</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Medication Reminders</h3>
                <p className="text-slate-600 leading-relaxed">Set up reminders for your medications so you never miss a dose</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Spot Patterns</h3>
                <p className="text-slate-600 leading-relaxed">See how your symptoms change over time and identify your triggers</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Food Diary</h3>
                <p className="text-slate-600 leading-relaxed">Keep track of what you eat and how it affects your symptoms</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Your Data, Private</h3>
                <p className="text-slate-600 leading-relaxed">All your health information stays private and secure</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Share with Your Doctor</h3>
                <p className="text-slate-600 leading-relaxed">Export reports to share with your healthcare team</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-500 rounded-2xl p-8 md:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-bold font-source mb-6">
                Built by someone who understands
              </h2>
              <div className="space-y-4 text-lg text-blue-50">
                <p>
                  Living with IBD means tracking a lot of information. What you ate, how you're feeling,
                  which medications you took, and so much more.
                </p>
                <p>
                  FlareCare was created to make this easier. It's not about fancy features or complicated
                  analytics. It's about having a simple, reliable place to track your health journey.
                </p>
                <p>
                  Whether you're newly diagnosed or have been managing IBD for years, FlareCare is here
                  to help you understand your body better and feel more in control.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-16 pb-8 sm:py-20 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-source text-slate-900">
              Start tracking today
            </h2>
            <p className="text-lg text-slate-600 mt-4">
              Join others who are taking control of their IBD journey
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/auth" className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-lg font-medium">
                Sign In
          </Link>
        </div>
          </div>
        </section>

        {/* Footer removed here to avoid duplicate; global Footer component handles it */}
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
