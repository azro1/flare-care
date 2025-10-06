'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { useEffect } from 'react'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()

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
                <span className="block text-blue-600 my-2">
                  IBD Journey
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
  return (
    <div>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto sm:px-6 lg:p-8">
          <div className="text-center fade-in-up">
            {/* Mobile Hero - Different Layout */}
            <div className="sm:hidden">
              {/* Logo Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              
              <h1 className="text-3xl font-bold font-source text-slate-900 mb-3">
                FlareCare
              </h1>
              <p className="text-lg font-semibold font-source text-blue-600 mb-5">
                Your Personal Crohn's & Colitis Companion
              </p>
              <p className="text-lg font-roboto text-slate-600 mb-6 leading-relaxed">
                Track symptoms, manage medications, and generate reports for better health decisions
              </p>
            </div>

            {/* Desktop Hero - Original Layout */}
            <div className="hidden sm:block">
              <div className="mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 pulse-animation">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-slate-900 mb-4 sm:mb-6">
                FlareCare
              </h1>
              <p className="text-xl font-semibold font-source text-blue-600 mb-5">
                Your Personal Crohn's & Colitis Companion
              </p>
              <p className="text-base sm:text-lg font-roboto text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
                Track your symptoms, manage medications, and generate detailed reports to help you and your healthcare team make informed decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 pt-4 sm:px-6 lg:pt-0 lg:px-8 sm:pb-16 lg:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <Link href="/symptoms" className="group">
            <div className="feature-card group h-full min-h-[280px] sm:min-h-[320px]">
              <div className="relative z-10 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-emerald-200 group-hover:to-green-200 transition-all duration-300 lg:group-hover:scale-110">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-source text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">Symptoms</h3>
                <p className="text-slate-600 font-roboto leading-relaxed">Track your daily symptoms, severity, and triggers to identify patterns and improve your quality of life.</p>
              </div>
            </div>
          </Link>

          <Link href="/medications" className="group">
            <div className="feature-card group h-full min-h-[280px] sm:min-h-[320px]">
              <div className="relative z-10 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-purple-200 group-hover:to-violet-200 transition-all duration-300 lg:group-hover:scale-110">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-source text-slate-900 mb-3 group-hover:text-purple-700 transition-colors duration-300">Medications</h3>
                <p className="text-slate-600 font-roboto leading-relaxed">Manage your medication schedule, track adherence, and never miss a dose with smart reminders.</p>
              </div>
            </div>
          </Link>

          <Link href="/reports" className="group sm:col-span-2 lg:col-span-1">
            <div className="feature-card group h-full min-h-[280px] sm:min-h-[320px]">
              <div className="relative z-10 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-orange-200 group-hover:to-amber-200 transition-all duration-300 lg:group-hover:scale-110">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-source text-slate-900 mb-3 group-hover:text-orange-700 transition-colors duration-300">Reports</h3>
                <p className="text-slate-600 font-roboto leading-relaxed">Generate detailed reports and export data for your healthcare team to make informed decisions.</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Call to Action */}
        <div className="relative">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 lg:p-10 shadow-sm">
            <div className="text-center">
              <div className="mb-6">
                <span className="text-4xl sm:text-5xl">🚀</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-source text-slate-900 mb-4 sm:mb-6">
                Ready to take control?
              </h2>
              <p className="text-slate-700 mb-8 sm:mb-10 text-base sm:text-lg font-roboto leading-relaxed max-w-2xl mx-auto">
                Every journey begins with a single step. Start by logging your first symptom entry - 
                it only takes a minute, but the insights you'll gain are priceless. 
                Your future self will thank you for the data you collect today.
              </p>
              <Link href="/symptoms" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold font-roboto inline-flex items-center gap-2 text-base px-6 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95">
                <span>Start Your Journey</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
