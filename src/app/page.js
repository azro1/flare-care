'use client'

import Link from 'next/link'
import WeatherHero from '@/components/WeatherHero'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import { useRouter } from 'next/navigation'
import { CupSoda, Pizza, Coffee, BookOpen, Smile, Thermometer, Pill, FileText, Activity, TrendingUp, PartyPopper, Clipboard, Cookie, ChartLine, Sparkles, ChevronRight } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const { data: symptoms } = useDataSync('flarecare-symptoms', [])
  const { data: medications } = useDataSync('flarecare-medications', [])
  const router = useRouter()
  const [showAllSymptoms, setShowAllSymptoms] = useState(false)
  const [showAllMedications, setShowAllMedications] = useState(false)
  const [trackedMedications, setTrackedMedications] = useState([])
  const [showToast, setShowToast] = useState(false)
  const [showDeleteToast, setShowDeleteToast] = useState(false)
  const [showMedicationToast, setShowMedicationToast] = useState(false)
  const [showMedicationDeleteToast, setShowMedicationDeleteToast] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)

  // Daily tips array
  const dailyTips = [
    "Log symptoms within 1-2 days for better accuracy - you'll remember more details about what triggered them",
    "Be honest with yourself - truthful answers help the app learn your patterns and provide better insights",
    "Start your week with a symptom check-in to track any weekend changes",
    "Weekend approaching! Log any stress or dietary changes that might affect your symptoms",
    "Keep a consistent sleep schedule - it can help reduce IBD flare-ups",
    "Track your stress levels - high stress can trigger symptoms in many people"
  ]

  // Rotate tips every minute with fade effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true)
      setTimeout(() => {
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % dailyTips.length)
        setIsFading(false)
      }, 500) // Fade out duration
    }, 60000) // 60 seconds (1 minute) between changes

    return () => clearInterval(interval)
  }, [])

  // Check for toast notifications
  useEffect(() => {
    const showSymptomToast = localStorage.getItem('showSymptomToast')
    if (showSymptomToast === 'true') {
      setShowToast(true)
      localStorage.removeItem('showSymptomToast')
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setShowToast(false)
      }, 4000)
    }

    const showDeleteToast = localStorage.getItem('showDeleteToast')
    if (showDeleteToast === 'true') {
      setShowDeleteToast(true)
      localStorage.removeItem('showDeleteToast')
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setShowDeleteToast(false)
      }, 4000)
    }

    const showMedicationToast = localStorage.getItem('showMedicationToast')
    if (showMedicationToast === 'true') {
      setShowMedicationToast(true)
      localStorage.removeItem('showMedicationToast')
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setShowMedicationToast(false)
      }, 4000)
    }

    const showMedicationDeleteToast = localStorage.getItem('showMedicationDeleteToast')
    if (showMedicationDeleteToast === 'true') {
      setShowMedicationDeleteToast(true)
      localStorage.removeItem('showMedicationDeleteToast')
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setShowMedicationDeleteToast(false)
      }, 4000)
    }

  }, [])

  // Load tracked medications from Supabase medications data
  useEffect(() => {
    // Filter medication tracking entries from medications data
    const medicationTrackingEntries = medications.filter(med => med.name === 'Medication Tracking')
    setTrackedMedications(medicationTrackingEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }, [medications, showMedicationToast]) // Reload when medications change or medication is added



  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'var(--bg-main)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-primary">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show a compelling landing page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <section className="pt-32 pb-16 sm:pt-40 sm:pb-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6 mb-20">
              <div>
                <div className="text-cadet-blue text-xl font-medium font-source mb-1.5">FlareCare</div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight">
                Take control of
                  <br />
                  your
                  <span className="text-[#5F9EA0]"> IBD</span>
                </h1>
              </div>


              <p className="text-lg sm:text-xl text-secondary leading-relaxed max-w-2xl mx-auto">
              Because living with Crohn’s is more than managing symptoms — it’s understanding your story
              </p>

              <Link href="/auth" className="inline-block mt-6 px-8 py-2.5 bg-[#5F9EA0] text-white rounded-lg hover:bg-button-cadet-hover transition-colors text-lg font-bold">
                Sign In
              </Link>
            </div>

            <div className="card p-8 md:p-10 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#5F9EA0] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">JD</span>
                </div>
                <div>
                  <div className="text-primary font-medium">Today's entry</div>
                  <div className="text-sm text-slate-400 dark:[color:var(--text-tertiary)]">Oct 21, 2025 · 8:30 AM</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Smile className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-primary mb-1">Feeling pretty good today</div>
                    <div className="text-slate-400 dark:[color:var(--text-tertiary)] text-sm">Pain around 2/10, energy is decent</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Coffee className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-primary mb-1">Had oatmeal for breakfast</div>
                    <div className="text-slate-400 dark:[color:var(--text-tertiary)] text-sm">Skipping coffee today to be safe</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-primary mb-1">All meds taken</div>
                    <div className="text-slate-400 dark:[color:var(--text-tertiary)] text-sm">Set up reminders for tomorrow</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 px-6 section-bg">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4">
                Just what you need, nothing more
              </h2>
              <p className="sm:text-lg text-secondary">
                Simple tools that actually help
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 text-center md:text-left">
              <div className="space-y-3 flex flex-col items-center md:items-start">
                <div className="w-12 h-12 icon-container landing-icon">
                  <Clipboard className="w-6 h-6 text-pink-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-primary">Daily check-ins</h3>
                <p className="text-secondary leading-relaxed">
                  Quick notes about how you're feeling. Track pain, energy, bathroom trips, whatever matters to you.
                </p>
              </div>

              <div className="space-y-3 flex flex-col items-center md:items-start">
                <div className="w-12 h-12 icon-container landing-icon">
                  <Cookie className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-primary">Food diary</h3>
                <p className="text-secondary leading-relaxed">
                  See what works for your body. Log meals and notice patterns over time.
                </p>
              </div>

              <div className="space-y-3 flex flex-col items-center md:items-start">
                <div className="w-12 h-12 icon-container landing-icon">
                  <Pill className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-primary">Medication tracking</h3>
                <p className="text-secondary leading-relaxed">
                  Never forget a dose. Simple reminders that actually work.
                </p>
              </div>

              <div className="space-y-3 flex flex-col items-center md:items-start">
                <div className="w-12 h-12 icon-container landing-icon">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-primary">Spot your triggers</h3>
                <p className="text-secondary leading-relaxed">
                  See patterns in your symptoms. Share reports with your doctor.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="card p-10 md:p-14 rounded-2xl backdrop-blur-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6">
                Why I built this
              </h2>
              <div className="space-y-4 text-secondary leading-relaxed">
                <p className="sm:text-lg">
                  After my diagnosis, I tried a bunch of health tracking apps. They were either too
                  complicated, too medical, or just felt like homework.
                </p>
                <p className="sm:text-lg">
                  I wanted something simple. Something that felt like writing in a journal, not
                  filling out a form. A place where I could be honest about my bad days without
                  judgment.
                </p>
                <p className="sm:text-lg">
                  So I made Flarecare for myself. And if it helps you too, that makes me really happy.
                </p>
                <div className="pt-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#5F9EA0] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">S</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-primary font-medium">Simon</div>
                    <div className="text-sm text-tertiary">Living with Crohn's since 2005</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 px-6 section-bg">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary">
              Ready to start?
            </h2>
            <p className="text-lg sm:text-xl text-secondary">
              Open your journal, jot how you feel, and build your own story.
            </p>
              <Link href="/auth" className="inline-block px-8 py-2.5 bg-[#5F9EA0] text-white rounded-lg hover:bg-button-cadet-hover transition-colors text-lg sm:text-xl font-bold">
              Sign In
          </Link>
            <p className="text-sm text-tertiary">Your data stays private, always</p>
        </div>
        </section>
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
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 bg-green-100 text-green-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-green-600">
          <span className="font-medium">Symptom entry added successfully!</span>
          <button
            onClick={() => setShowToast(false)}
            className="ml-3 text-green-600/80 hover:text-green-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete Toast Notification */}
      {showDeleteToast && (
        <div className="fixed top-24 right-4 z-50 bg-red-100 text-red-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-red-600">
          <span className="font-medium">Symptom entry deleted successfully!</span>
          <button
            onClick={() => setShowDeleteToast(false)}
            className="ml-3 text-red-600/80 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showMedicationToast && (
        <div className="fixed top-24 right-4 z-50 bg-pink-100 text-pink-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-pink-600">
          <span className="font-medium">Medications tracked successfully!</span>
          <button
            onClick={() => setShowMedicationToast(false)}
            className="ml-3 text-pink-600/80 hover:text-pink-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showMedicationDeleteToast && (
        <div className="fixed top-24 right-4 z-50 bg-red-100 text-red-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-red-600">
          <span className="font-medium">Medication entry deleted successfully!</span>
          <button
            onClick={() => setShowMedicationDeleteToast(false)}
            className="ml-3 text-red-600/80 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:justify-center">
          
          {/* Left Sidebar */}
          <div className="lg:w-72 lg:flex-shrink-0 order-2 lg:order-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Quick Stats */}
              <div className="p-4 sm:p-6 lg:py-0 lg:pb-2">
                <h3 className="text-lg font-semibold font-source text-primary mb-4">Your Progress</h3>
                <div className="space-y-2 border-l-4 pl-4 sm:pl-5" style={{borderColor: 'var(--text-cadet-blue)'}}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Total Symptoms</span>
                    <span className="font-semibold" style={{color: 'var(--text-cadet-blue)'}}>{symptoms.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">This Week</span>
                    <span className="font-semibold" style={{color: 'var(--text-cadet-blue)'}}>
                        {symptoms.filter(s => {
                          const weekAgo = new Date()
                          weekAgo.setDate(weekAgo.getDate() - 7)
                          return new Date(s.created_at || s.createdAt) > weekAgo
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Today</span>
                    <span className="font-semibold" style={{color: 'var(--text-cadet-blue)'}}>{todaySymptoms.length}</span>
                    </div>
                </div>
            </div>

              {/* Today's Goals */}
              <div className="card no-hover-border p-4 sm:p-6">
                <h3 className="text-lg font-semibold font-source text-primary mb-4">Today's Goals</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center`} style={{backgroundColor: 'var(--bg-goal-icon-success)'}}>
                      <Thermometer className="w-3 h-3" style={{color: 'var(--text-goal-icon-success)'}} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-sm ${todaySymptoms.length > 0 ? '' : 'text-secondary'}`} style={{color: todaySymptoms.length > 0 ? 'var(--text-goal-success)' : undefined}}>
                        Log symptoms
                      </span>
                      {todaySymptoms.length > 0 && (
                        <svg className="w-5 h-5" style={{color: 'var(--text-goal-success)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--bg-goal-icon-medication)'}}>
                      <Pill className="w-2.5 h-2.5" style={{color: 'var(--text-goal-icon-medication)'}} />
                    </div>
                    <span className="text-sm text-secondary">Take medications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--bg-goal-icon-hydration)'}}>
                      <CupSoda className="w-3 h-3" style={{color: 'var(--text-goal-icon-hydration)'}} />
                    </div>
                    <span className="text-sm text-secondary">Stay hydrated</span>
                  </div>
                </div>
              </div>

              {/* Daily Tip */}
              <div className="p-4 sm:p-6 sm:pt-0 lg:pt-2">
                <div>
                  <h3 className="text-lg font-semibold font-source text-primary mb-2">💡 Daily Tip</h3>
                  <p className={`text-sm text-secondary transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                    {dailyTips[currentTipIndex]}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:max-w-4xl order-1 lg:order-2">
        {/* Weather Hero with Greeting & Date inside */}
        <WeatherHero>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-2 sm:mb-3">
            {(() => {
              const hour = new Date().getHours()
              if (hour < 12) return 'Good morning'
              if (hour < 17) return 'Good afternoon'
              return 'Good evening'
            })()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-sm font-roboto text-secondary">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </WeatherHero>

        

        {/* Quick Actions */}
        <div className="mt-8 md:mt-10 mb-8">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">Get Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/symptoms"
              className="card card-link p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
            >
              <div className="flex items-center sm:flex-col sm:items-center gap-4 sm:gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Thermometer className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 sm:w-full sm:text-center">
                  <h3 className="font-semibold text-primary leading-relaxed sm:justify-center">
                    Log Symptoms
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary sm:hidden" />
              </div>
              <div className="pointer-events-none absolute right-3 -top-8 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                <div className="rounded-lg bg-[var(--bg-card)] px-4 py-3 text-left text-sm text-secondary leading-snug shadow-lg ring-1 ring-[var(--border-primary)] dark:bg-[#1a1d24]" style={{ fontFamily: 'Trebuchet MS, Lucida Grande, sans-serif' }}>
                  Record how you're feeling and track your symptoms
                </div>
              </div>
            </Link>

            <Link
              href="/medications/track"
              className="card card-link p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
            >
              <div className="flex items-center sm:flex-col sm:items-center gap-4 sm:gap-3">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <ChartLine className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1 sm:w-full sm:text-center">
                  <h3 className="font-semibold text-primary leading-relaxed sm:justify-center">
                    Track Meds
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary sm:hidden" />
              </div>
              <div className="pointer-events-none absolute right-3 -top-8 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                <div className="rounded-lg bg-[var(--bg-card)] px-4 py-3 text-left text-sm text-secondary leading-snug shadow-lg ring-1 ring-[var(--border-primary)] dark:bg-[#1a1d24]" style={{ fontFamily: 'Trebuchet MS, Lucida Grande, sans-serif' }}>
                  Log missed medications and track your adherence
                </div>
              </div>
            </Link>

            <Link
              href="/reports"
              className="card card-link p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
            >
              <div className="flex items-center sm:flex-col sm:items-center gap-4 sm:gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 sm:w-full sm:text-center">
                  <h3 className="font-semibold text-primary leading-relaxed sm:justify-center">
                    Reports
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary sm:hidden" />
              </div>
              <div className="pointer-events-none absolute right-3 -top-8 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                <div className="rounded-lg bg-[var(--bg-card)] px-4 py-3 text-left text-sm text-secondary leading-snug shadow-lg ring-1 ring-[var(--border-primary)] dark:bg-[#1a1d24]" style={{ fontFamily: 'Trebuchet MS, Lucida Grande, sans-serif' }}>
                  View insights and share data with your doctor
                </div>
              </div>
            </Link>
        </div>
        </div>

        {/* Section Divider */}
        <div className="border-t mb-8" style={{borderColor: 'var(--border-primary)'}}></div>

        {/* Today's Summary */}
        <div>
          <h2 className="text-xl font-semibold font-source text-primary">Today's Summary</h2>
          <div className="p-6">
            <div className="flex justify-between items-center py-2">
              <span className="text-secondary">Symptoms Logged</span>
              <span className="font-semibold text-primary">{todaySymptoms.length}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-secondary">Medications Taken</span>
              <span className="font-semibold text-primary">0/0</span>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-t mb-8" style={{borderColor: 'var(--border-primary)'}}></div>

        {/* Recent Symptoms */}
        {displayedSymptoms.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold font-source text-primary">Recent Logged Symptoms</h2>
              {symptoms.length > 1 && (
                <button 
                  onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                  className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 text-sm font-medium self-start sm:self-auto"
                >
                  {showAllSymptoms ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>
            <div className="space-y-3 max-w-xs">
              {displayedSymptoms.map((symptom) => (
                <div key={symptom.id} className="flex items-center">
                  <div className="w-1 h-20 bg-emerald-600 mx-3"></div>
                  <div 
                    className="card p-6  cursor-pointer transition-all duration-200 flex-1"
                    onClick={() => {
                      router.push(`/symptoms/${symptom.id}`)
                    }}
                  >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {new Date(symptom.created_at || symptom.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">
                        {new Date(symptom.created_at || symptom.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-secondary">
                      <span>View details</span>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      

        {/* Recent Medications */}
        {trackedMedications.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold font-source text-primary">Recent Tracked Medications</h2>
              {trackedMedications.length > 1 && (
                <button 
                  onClick={() => setShowAllMedications(!showAllMedications)}
                  className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 text-sm font-medium self-start sm:self-auto"
                >
                  {showAllMedications ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>
            <div className="space-y-3 max-w-xs">
              {(showAllMedications ? trackedMedications : trackedMedications.slice(0, 1)).map((tracked, index) => (
                <div key={tracked.id} className="flex items-center">
                  <div className="w-1 h-20 bg-pink-600 mx-3"></div>
                  <div 
                    className="card p-6  cursor-pointer transition-all duration-200 flex-1"
                    onClick={() => {
                      router.push(`/medications/track/${tracked.id}`)
                    }}
                  >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {new Date(tracked.created_at || tracked.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">
                        {new Date(tracked.created_at || tracked.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-secondary">
                      <span>View details</span>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Divider */}
        {(symptoms.length > 0 || trackedMedications.length > 0) && (
           <div className="border-t my-8" style={{borderColor: 'var(--border-primary)'}}></div>
        )}
        
        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold font-source text-primary">Recent Activity</h2>
          <div className="p-6 transition-all duration-300 ease-in-out">
            {symptoms.length === 0 && trackedMedications.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 icon-container icon-container--muted mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-secondary text-sm">No recent activity</p>
                <p className="text-xs text-secondary mt-1">Start tracking your symptoms and medications to see activity here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Most recent symptom entry */}
                {symptoms.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Thermometer className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">Logged symptoms</p>
                      <p className="text-xs text-slate-400 dark:[color:var(--text-tertiary)] mt-1">
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
                )}

                {/* Most recent medication entry */}
                {trackedMedications.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <ChartLine className="w-3.5 h-3.5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">Tracked medications</p>
                      <p className="text-xs text-slate-400 dark:[color:var(--text-tertiary)] mt-1">
                        {(() => {
                          const lastMedication = trackedMedications[0]
                          const lastDate = new Date(lastMedication.created_at || lastMedication.createdAt)
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
                )}

                {/* Tracking streak */}
                {symptoms.length >= 3 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-gray-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">Completed {symptoms.length}-day tracking streak</p>
                      <p className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">Great consistency!</p>
                    </div>
                  </div>
                )}

                {/* Welcome message for new users */}
                {symptoms.length === 1 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                      <PartyPopper className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">Welcome to FlareCare!</p>
                      <p className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">You've logged your first symptom entry</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-t mb-8" style={{borderColor: 'var(--border-primary)'}}></div>

        {/* More Options */}
        <div className="mb-4 lg:mb-8">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link href="/about" className="card p-6  transition-all">
              <div className="text-center">
                <div className="w-12 h-12 icon-container dark:bg-gray-700 mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-primary">About</h3>
              </div>
            </Link>

            <Link href="/ibd" className="card p-6  transition-all">
            <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-primary">IBD</h3>
              </div>
            </Link>

            <Link href="/foods" className="card p-6  transition-all">
              <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Pizza className="w-6 h-6 text-yellow-600" />
              </div>
                <h3 className="font-semibold text-primary">Foods</h3>
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
