'use client'

import Link from 'next/link'
import WeatherHero from '@/components/WeatherHero'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, TABLES } from '@/lib/supabase'
import { CupSoda, Pizza, Coffee, BookOpen, Smile, Thermometer, Pill, FileText, Activity, TrendingUp, PartyPopper, Clipboard, Cookie, ChartLine, Sparkles, ChevronRight, ChevronDown, ChevronLeft, Clock, Scale, Calendar, Lightbulb, Newspaper } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [medications, setMedications] = useState([])
  const router = useRouter()
  const [showAllSymptoms, setShowAllSymptoms] = useState(false)
  const [showAllMedications, setShowAllMedications] = useState(false)
  const [trackedMedications, setTrackedMedications] = useState([])
  const [showToast, setShowToast] = useState(false)
  const [showDeleteToast, setShowDeleteToast] = useState(false)
  const [showMedicationToast, setShowMedicationToast] = useState(false)
  const [showMedicationDeleteToast, setShowMedicationDeleteToast] = useState(false)
  const [showAccountDeletedToast, setShowAccountDeletedToast] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [takenMedications, setTakenMedications] = useState([])
  const [medicationsCompletedAt, setMedicationsCompletedAt] = useState(null)
  const [medicationAdded, setMedicationAdded] = useState(null)
  const [medicationUpdated, setMedicationUpdated] = useState(null)
  const [medicationDeleted, setMedicationDeleted] = useState(null)
  const [symptomDeleted, setSymptomDeleted] = useState(null)
  const [trackedMedicationDeleted, setTrackedMedicationDeleted] = useState(null)
  const [individualMedicationTakings, setIndividualMedicationTakings] = useState([])
  const [weightEntries, setWeightEntries] = useState([])
  const [weightDeleted, setWeightDeleted] = useState(null)
  const [weightUpdated, setWeightUpdated] = useState(null)
  const [appointmentAdded, setAppointmentAdded] = useState(null)
  const [appointmentUpdated, setAppointmentUpdated] = useState(null)
  const [appointmentDeleted, setAppointmentDeleted] = useState(null)
  const [newsItems, setNewsItems] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState(null)
  const newsScrollRef = useRef(null)
  const [newsAtStart, setNewsAtStart] = useState(true)
  const [newsAtEnd, setNewsAtEnd] = useState(false)

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

    // Check for account deleted toast with a small delay to ensure it's set
    const checkAccountDeletedToast = () => {
      const showAccountDeletedToast = localStorage.getItem('showAccountDeletedToast')
      if (showAccountDeletedToast === 'true') {
        setShowAccountDeletedToast(true)
        localStorage.removeItem('showAccountDeletedToast')
        
        // Auto-hide toast after 4 seconds
        setTimeout(() => {
          setShowAccountDeletedToast(false)
        }, 4000)
      }
    }

    // Run immediately and also after a small delay
    checkAccountDeletedToast()
    const timeoutId = setTimeout(checkAccountDeletedToast, 200)

    return () => clearTimeout(timeoutId)
  }, [])

  // Fetch symptoms directly from Supabase
  useEffect(() => {
    const fetchSymptoms = async () => {
      if (!user?.id) {
        setSymptoms([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.SYMPTOMS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          // Transform snake_case to camelCase
          const transformedSymptoms = data.map(item => {
            const {
              symptom_start_date,
              is_ongoing,
              symptom_end_date,
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              symptomStartDate: symptom_start_date,
              isOngoing: is_ongoing,
              symptomEndDate: symptom_end_date,
              createdAt: created_at,
              created_at: created_at, // Keep both for compatibility
              updatedAt: updated_at
            }
          })
          setSymptoms(transformedSymptoms)
        }
      } catch (error) {
        console.error('Error fetching symptoms:', error)
        setSymptoms([])
      }
    }

    fetchSymptoms()

    // Refresh when window gains focus (user navigates back to dashboard)
    const handleFocus = () => {
      fetchSymptoms()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.id])

  // Fetch medications directly from Supabase
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.id) {
        setMedications([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .neq('name', 'Medication Tracking')
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          // Transform snake_case to camelCase
          const transformedMedications = data.map(item => {
            const {
              time_of_day,
              reminders_enabled,
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              timeOfDay: time_of_day || '',
              remindersEnabled: reminders_enabled !== false,
              createdAt: created_at,
              updatedAt: updated_at
            }
          })
          setMedications(transformedMedications)
        }
      } catch (error) {
        console.error('Error fetching medications:', error)
        setMedications([])
      }
    }

    fetchMedications()
  }, [user?.id])

  // Fetch tracked medications directly from Supabase
  useEffect(() => {
    const fetchTrackedMedications = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from(TABLES.TRACK_MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          setTrackedMedications(data)
        }
      } catch (error) {
        console.error('Error fetching tracked medications:', error)
      }
    }

    fetchTrackedMedications()

    // Refresh when window gains focus (user navigates back to dashboard)
    const handleFocus = () => {
      fetchTrackedMedications()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.id, showMedicationToast])

  // Fetch weight entries for Recent Activity
  useEffect(() => {
    const fetchWeightEntries = async () => {
      if (!user?.id) {
        setWeightEntries([])
        return
      }
      try {
        const { data, error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .select('id, date, value_kg, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setWeightEntries(data || [])
      } catch (error) {
        console.error('Error fetching weight entries:', error)
        setWeightEntries([])
      }
    }

    fetchWeightEntries()

    const handleFocus = () => {
      fetchWeightEntries()
    }
    const handleWeightAdded = () => {
      fetchWeightEntries()
    }
    const handleWeightDeleted = () => {
      fetchWeightEntries()
    }
    const handleWeightUpdated = () => {
      fetchWeightEntries()
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('weight-added', handleWeightAdded)
    window.addEventListener('weight-deleted', handleWeightDeleted)
    window.addEventListener('weight-updated', handleWeightUpdated)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('weight-added', handleWeightAdded)
      window.removeEventListener('weight-deleted', handleWeightDeleted)
      window.removeEventListener('weight-updated', handleWeightUpdated)
    }
  }, [user?.id])

  // Fetch Crohn's & Colitis news for dashboard
  useEffect(() => {
    if (!isAuthenticated) return
    setNewsLoading(true)
    setNewsError(null)
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        setNewsItems(data.items || [])
        if (data.error) setNewsError(data.error)
      })
      .catch(() => setNewsError('Failed to load news'))
      .finally(() => setNewsLoading(false))
  }, [isAuthenticated])

  useEffect(() => {
    if (!newsItems.length) return
    const el = newsScrollRef.current
    if (!el) return
    const run = () => {
      const atStart = el.scrollLeft <= 1
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      setNewsAtStart(atStart)
      setNewsAtEnd(atEnd)
    }
    run()
    const id = setTimeout(run, 100)
    const id2 = setTimeout(run, 500)
    el.addEventListener('scroll', run)
    window.addEventListener('resize', run)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => {
      clearTimeout(id)
      clearTimeout(id2)
      el.removeEventListener('scroll', run)
      window.removeEventListener('resize', run)
      ro.disconnect()
    }
  }, [newsItems])

  // Track daily medication intake with localStorage
  useEffect(() => {
    const loadTakenMedications = () => {
      if (!user?.id) return
      
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const storageKey = `flarecare-medications-taken-${today}`
      
      // Clean up old entries (keep only today's for current user)
      const cleanupOldEntries = () => {
        const keysToRemove = []
        const timestampKey = `flarecare-medications-completed-${today}`
        const activityKey = `flarecare-medication-added-${user.id}-${today}`
        const updatedKey = `flarecare-medication-updated-${user.id}-${today}`
        const deletedKey = `flarecare-medication-deleted-${user.id}-${today}`
        const symptomDeletedKey = `flarecare-symptom-deleted-${user.id}-${today}`
        const trackedMedDeletedKey = `flarecare-tracked-medication-deleted-${user.id}-${today}`
        const weightDeletedKey = `flarecare-weight-deleted-${user.id}-${today}`
        const weightUpdatedKey = `flarecare-weight-updated-${user.id}-${today}`
        const appointmentAddedKey = `flarecare-appointment-added-${user.id}-${today}`
        const appointmentUpdatedKey = `flarecare-appointment-updated-${user.id}-${today}`
        const appointmentDeletedKey = `flarecare-appointment-deleted-${user.id}-${today}`
        const individualTakingsKey = `flarecare-medication-individual-takings-${user.id}-${today}`
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (
            (key.startsWith('flarecare-medications-taken-') && key !== storageKey) ||
            (key.startsWith('flarecare-medications-completed-') && key !== timestampKey) ||
            (key.startsWith(`flarecare-medication-added-${user.id}-`) && key !== activityKey) ||
            (key.startsWith(`flarecare-medication-updated-${user.id}-`) && key !== updatedKey) ||
            (key.startsWith(`flarecare-medication-deleted-${user.id}-`) && key !== deletedKey) ||
            (key.startsWith(`flarecare-symptom-deleted-${user.id}-`) && key !== symptomDeletedKey) ||
            (key.startsWith(`flarecare-tracked-medication-deleted-${user.id}-`) && key !== trackedMedDeletedKey) ||
            (key.startsWith(`flarecare-weight-deleted-${user.id}-`) && key !== weightDeletedKey) ||
            (key.startsWith(`flarecare-weight-updated-${user.id}-`) && key !== weightUpdatedKey) ||
            (key.startsWith(`flarecare-appointment-added-${user.id}-`) && key !== appointmentAddedKey) ||
            (key.startsWith(`flarecare-appointment-updated-${user.id}-`) && key !== appointmentUpdatedKey) ||
            (key.startsWith(`flarecare-appointment-deleted-${user.id}-`) && key !== appointmentDeletedKey) ||
            (key.startsWith(`flarecare-medication-individual-takings-${user.id}-`) && key !== individualTakingsKey)
          )) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      
      // Clean up old entries
      cleanupOldEntries()
      
      // Load today's taken medications
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          setTakenMedications(JSON.parse(stored))
        } catch (error) {
          console.error('Error parsing taken medications:', error)
          setTakenMedications([])
        }
      } else {
        setTakenMedications([])
      }
      
      // Load completion timestamp
      const timestampKey = `flarecare-medications-completed-${today}`
      const completedTimestamp = localStorage.getItem(timestampKey)
      setMedicationsCompletedAt(completedTimestamp || null)
      
      // Load medication added activity
      const activityKey = `flarecare-medication-added-${user.id}-${today}`
      const medicationAddedData = localStorage.getItem(activityKey)
      if (medicationAddedData) {
        try {
          setMedicationAdded(JSON.parse(medicationAddedData))
        } catch (error) {
          console.error('Error parsing medication added data:', error)
          setMedicationAdded(null)
        }
      } else {
        setMedicationAdded(null)
      }
      
      // Load medication updated activity
      const updatedKey = `flarecare-medication-updated-${user.id}-${today}`
      const medicationUpdatedData = localStorage.getItem(updatedKey)
      if (medicationUpdatedData) {
        try {
          setMedicationUpdated(JSON.parse(medicationUpdatedData))
        } catch (error) {
          console.error('Error parsing medication updated data:', error)
          setMedicationUpdated(null)
        }
      } else {
        setMedicationUpdated(null)
      }
      
      // Load medication deleted activity
      const deletedKey = `flarecare-medication-deleted-${user.id}-${today}`
      const medicationDeletedData = localStorage.getItem(deletedKey)
      if (medicationDeletedData) {
        try {
          setMedicationDeleted(JSON.parse(medicationDeletedData))
        } catch (error) {
          console.error('Error parsing medication deleted data:', error)
          setMedicationDeleted(null)
        }
      } else {
        setMedicationDeleted(null)
      }
      
      // Load symptom deleted activity
      const symptomDeletedKey = `flarecare-symptom-deleted-${user.id}-${today}`
      const symptomDeletedData = localStorage.getItem(symptomDeletedKey)
      if (symptomDeletedData) {
        try {
          setSymptomDeleted(JSON.parse(symptomDeletedData))
        } catch (error) {
          console.error('Error parsing symptom deleted data:', error)
          setSymptomDeleted(null)
        }
      } else {
        setSymptomDeleted(null)
      }
      
      // Load tracked medication deleted activity
      const trackedMedDeletedKey = `flarecare-tracked-medication-deleted-${user.id}-${today}`
      const trackedMedDeletedData = localStorage.getItem(trackedMedDeletedKey)
      if (trackedMedDeletedData) {
        try {
          setTrackedMedicationDeleted(JSON.parse(trackedMedDeletedData))
        } catch (error) {
          console.error('Error parsing tracked medication deleted data:', error)
          setTrackedMedicationDeleted(null)
        }
      } else {
        setTrackedMedicationDeleted(null)
      }

      // Load weight deleted activity
      const weightDeletedKey = `flarecare-weight-deleted-${user.id}-${today}`
      const weightDeletedData = localStorage.getItem(weightDeletedKey)
      if (weightDeletedData) {
        try {
          setWeightDeleted(JSON.parse(weightDeletedData))
        } catch (error) {
          console.error('Error parsing weight deleted data:', error)
          setWeightDeleted(null)
        }
      } else {
        setWeightDeleted(null)
      }

      // Load weight updated activity
      const weightUpdatedKey = `flarecare-weight-updated-${user.id}-${today}`
      const weightUpdatedData = localStorage.getItem(weightUpdatedKey)
      if (weightUpdatedData) {
        try {
          setWeightUpdated(JSON.parse(weightUpdatedData))
        } catch (error) {
          console.error('Error parsing weight updated data:', error)
          setWeightUpdated(null)
        }
      } else {
        setWeightUpdated(null)
      }

      // Load appointment added activity
      const appointmentAddedKey = `flarecare-appointment-added-${user.id}-${today}`
      const appointmentAddedData = localStorage.getItem(appointmentAddedKey)
      if (appointmentAddedData) {
        try {
          setAppointmentAdded(JSON.parse(appointmentAddedData))
        } catch (error) {
          console.error('Error parsing appointment added data:', error)
          setAppointmentAdded(null)
        }
      } else {
        setAppointmentAdded(null)
      }

      // Load appointment updated activity
      const appointmentUpdatedKey = `flarecare-appointment-updated-${user.id}-${today}`
      const appointmentUpdatedData = localStorage.getItem(appointmentUpdatedKey)
      if (appointmentUpdatedData) {
        try {
          setAppointmentUpdated(JSON.parse(appointmentUpdatedData))
        } catch (error) {
          console.error('Error parsing appointment updated data:', error)
          setAppointmentUpdated(null)
        }
      } else {
        setAppointmentUpdated(null)
      }

      // Load appointment deleted activity
      const appointmentDeletedKey = `flarecare-appointment-deleted-${user.id}-${today}`
      const appointmentDeletedData = localStorage.getItem(appointmentDeletedKey)
      if (appointmentDeletedData) {
        try {
          setAppointmentDeleted(JSON.parse(appointmentDeletedData))
        } catch (error) {
          console.error('Error parsing appointment deleted data:', error)
          setAppointmentDeleted(null)
        }
      } else {
        setAppointmentDeleted(null)
      }
      
      // Load individual medication takings
      const individualTakingsKey = `flarecare-medication-individual-takings-${user.id}-${today}`
      const individualTakingsData = localStorage.getItem(individualTakingsKey)
      if (individualTakingsData) {
        try {
          const takings = JSON.parse(individualTakingsData)
          // Sort by timestamp, most recent first
          takings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          setIndividualMedicationTakings(takings)
        } catch (error) {
          console.error('Error parsing individual medication takings:', error)
          setIndividualMedicationTakings([])
        }
      } else {
        setIndividualMedicationTakings([])
      }
    }

    // Load on mount and when user changes
    loadTakenMedications()

    // Listen for storage changes (when medications are marked as taken in other tabs/windows)
    const handleStorageChange = (e) => {
      if (!user?.id) return
      
      if (e.key && (
        e.key.startsWith('flarecare-medications-taken-') ||
        e.key.startsWith('flarecare-medications-completed-') ||
        (e.key.startsWith('flarecare-medication-added-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-medication-updated-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-medication-deleted-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-symptom-deleted-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-tracked-medication-deleted-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-weight-deleted-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-weight-updated-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-appointment-added-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-appointment-updated-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-appointment-deleted-') && e.key.includes(`-${user.id}-`)) ||
        (e.key.startsWith('flarecare-medication-individual-takings-') && e.key.includes(`-${user.id}-`))
      )) {
        loadTakenMedications()
      }
    }

    // Listen for custom events
    const handleMedicationTaken = () => {
      loadTakenMedications()
    }
    
    const handleMedicationAdded = () => {
      loadTakenMedications()
    }
    
    const handleMedicationUpdated = () => {
      loadTakenMedications()
    }
    
    const handleMedicationDeleted = () => {
      loadTakenMedications()
    }
    
    const handleSymptomDeleted = () => {
      loadTakenMedications()
    }
    
    const handleTrackedMedicationDeleted = () => {
      loadTakenMedications()
    }

    const handleWeightDeleted = () => {
      loadTakenMedications()
    }

    const handleWeightUpdated = () => {
      loadTakenMedications()
    }

    const handleWeightAdded = () => {
      loadTakenMedications()
    }

    const handleAppointmentAdded = () => {
      loadTakenMedications()
    }

    const handleAppointmentUpdated = () => {
      loadTakenMedications()
    }

    const handleAppointmentDeleted = () => {
      loadTakenMedications()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('medication-taken', handleMedicationTaken)
    window.addEventListener('medication-added', handleMedicationAdded)
    window.addEventListener('medication-updated', handleMedicationUpdated)
    window.addEventListener('medication-deleted', handleMedicationDeleted)
    window.addEventListener('symptom-deleted', handleSymptomDeleted)
    window.addEventListener('tracked-medication-deleted', handleTrackedMedicationDeleted)
    window.addEventListener('weight-deleted', handleWeightDeleted)
    window.addEventListener('weight-updated', handleWeightUpdated)
    window.addEventListener('weight-added', handleWeightAdded)
    window.addEventListener('appointment-added', handleAppointmentAdded)
    window.addEventListener('appointment-updated', handleAppointmentUpdated)
    window.addEventListener('appointment-deleted', handleAppointmentDeleted)
    
    // Check when window gains focus (user navigates back to dashboard)
    const handleFocus = () => {
      loadTakenMedications()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('medication-taken', handleMedicationTaken)
      window.removeEventListener('medication-added', handleMedicationAdded)
      window.removeEventListener('medication-updated', handleMedicationUpdated)
      window.removeEventListener('medication-deleted', handleMedicationDeleted)
      window.removeEventListener('symptom-deleted', handleSymptomDeleted)
      window.removeEventListener('tracked-medication-deleted', handleTrackedMedicationDeleted)
      window.removeEventListener('weight-deleted', handleWeightDeleted)
      window.removeEventListener('weight-updated', handleWeightUpdated)
      window.removeEventListener('weight-added', handleWeightAdded)
      window.removeEventListener('appointment-added', handleAppointmentAdded)
      window.removeEventListener('appointment-updated', handleAppointmentUpdated)
      window.removeEventListener('appointment-deleted', handleAppointmentDeleted)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?.id])



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
        {/* Account Deleted Toast */}
        {showAccountDeletedToast && (
          <div className="fixed top-24 right-4 z-50 bg-red-100 text-red-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-red-600">
            <span className="font-medium">Account deleted successfully!</span>
            <button
              onClick={() => setShowAccountDeletedToast(false)}
              className="ml-3 text-red-600/80 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <section className="pt-32 pb-12 sm:pt-40 md:pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6 mb-12 md:mb-20">
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

            <div className="card !p-6 md:p-10 backdrop-blur-sm">
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

        <section className="py-12 md:py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="card !p-6 backdrop-blur-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6">
                Why I built this
              </h2>
              <div className="space-y-4 text-secondary leading-relaxed">
                <p>
                  After my diagnosis, I tried a bunch of health tracking apps. They were either too
                  complicated, too medical, or just felt like homework.
                </p>
                <p>
                  I wanted something simple. Something that felt like writing in a journal, not
                  filling out a form. A place where I could be honest about my bad days without
                  judgment.
                </p>
                <p>
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
              Your story starts here
            </h2>
            <p className="text-lg sm:text-xl text-secondary">
              Sign in to start tracking your symptoms and medications
            </p>
              <Link href="/auth" className="inline-block px-8 py-2.5 bg-[#5F9EA0] text-white rounded-lg hover:bg-button-cadet-hover transition-colors text-lg sm:text-xl font-bold">
              Sign In
          </Link>
            <p className="text-sm text-tertiary">Your data stays private and secure.</p>
        </div>
        </section>
      </div>
    )
  }
  // Format date in UK format (dd/mm/yyyy) - forces UK format on mobile
  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Get symptoms to display (1 by default, all if expanded)
  const displayedSymptoms = showAllSymptoms ? symptoms : symptoms.slice(0, 1)
  const todaySymptoms = symptoms.filter(symptom => {
    const today = new Date().toDateString()
    const symptomDate = new Date(symptom.created_at || symptom.createdAt).toDateString()
    return today === symptomDate
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
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

      {showAccountDeletedToast && (
        <div className="fixed top-24 right-4 z-50 bg-red-100 text-red-600 px-6 py-3 rounded-lg shadow-lg flex items-center max-w-xs border border-red-600">
          <span className="font-medium">Account deleted successfully!</span>
          <button
            onClick={() => setShowAccountDeletedToast(false)}
            className="ml-3 text-red-600/80 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="w-full sm:px-4 md:px-6 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col xl:flex-row xl:gap-6 xl:justify-center min-h-0">
          
          {/* Left Sidebar */}
          <div className="xl:w-72 xl:flex-shrink-0 order-2 xl:order-1">
            <div className="sticky top-6 space-y-5 sm:space-y-6">
              
              {/* Quick Stats */}
              <div className=" card">
                <h3 className="text-xl font-semibold font-source text-primary mb-3">Your Progress</h3>
                <div className="card-inner p-4 sm:p-5 space-y-2.5">
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-primary">Total symptoms</span>
                    <span className="font-semibold text-primary">{symptoms.length}</span>
                  </div>
                  <div className="border-t border-[var(--border-card-inner)] my-0" aria-hidden="true" />
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-primary">This week</span>
                    <span className="font-semibold text-primary">
                      {symptoms.filter(s => {
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return new Date(s.created_at || s.createdAt) > weekAgo
                      }).length}
                    </span>
                  </div>
                  <div className="border-t border-[var(--border-card-inner)] my-0" aria-hidden="true" />
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-primary">Today</span>
                    <span className="font-semibold text-primary">{todaySymptoms.length}</span>
                  </div>
                </div>
            </div>

              {/* Today's Goals */}
              <div className="card no-hover-border p-4 sm:p-6">
                <h3 className="text-xl font-semibold font-source text-primary mb-3">Today's Goals</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 card-inner flex items-center justify-center">
                      <Thermometer className="w-3.5 h-3.5" style={{color: 'var(--text-goal-icon-success)'}} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-sm ${todaySymptoms.length > 0 ? '' : 'text-primary'}`} style={{color: todaySymptoms.length > 0 ? 'var(--text-cadet-blue)' : undefined}}>
                        Log symptoms
                      </span>
                      {todaySymptoms.length > 0 && (
                        <svg className="w-5 h-5" style={{color: 'var(--text-cadet-blue)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 card-inner flex items-center justify-center">
                      <Pill className="w-3 h-3" style={{color: 'var(--text-goal-icon-medication)'}} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-sm ${takenMedications.length === medications.length && medications.length > 0 ? '' : 'text-primary'}`} style={{color: takenMedications.length === medications.length && medications.length > 0 ? 'var(--text-cadet-blue)' : undefined}}>
                        Take medications
                      </span>
                      {takenMedications.length === medications.length && medications.length > 0 && (
                        <svg className="w-5 h-5" style={{color: 'var(--text-cadet-blue)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 card-inner flex items-center justify-center">
                      <CupSoda className="w-3.5 h-3.5" style={{color: 'var(--text-goal-icon-hydration)'}} />
                    </div>
                    <span className="text-sm text-primary">Stay hydrated</span>
                  </div>
                </div>
              </div>

              {/* Daily Tip */}
              <div className="card">
                <div>
                  <h3 className="text-xl font-semibold font-source text-primary mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-white" />
                    Daily Tip
                  </h3>
                  <p className={`text-sm text-primary leading-relaxed sm:leading-normal transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                    {dailyTips[currentTipIndex]}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 xl:max-w-4xl order-1 xl:order-2">
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

        {/* Daily Tasks */}
        <div className="my-6">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">Daily Tasks</h2>
          {/* Mobile: single card with two rows + separator */}
          <div className="block sm:hidden">
            <div className="card !p-4 overflow-hidden">
              <Link
                href="/symptoms"
                className="flex items-center gap-3 pb-3 transition-colors hover:opacity-90 group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
              >
              <div className="w-10 h-10 bg-emerald-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                  <Thermometer className="w-5 h-5 text-emerald-600 dark:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight">Log Symptoms</h3>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0 text-secondary" />
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto">
                    Record how you're feeling and track your symptoms
                  </div>
                </div>
              </Link>
              <div className="border-t min-w-0" style={{ borderColor: 'var(--border-card-inner)' }} />
              <Link
                href="/medications/track"
                className="flex items-center gap-3 pt-3 transition-colors hover:opacity-90 group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
              >
<div className="w-10 h-10 bg-pink-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                <ChartLine className="w-5 h-5 text-pink-600 dark:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight">Track Medications</h3>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0 text-secondary" />
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto">
                    Log missed medications and track your adherence
                  </div>
                </div>
              </Link>
            </div>
          </div>
          {/* Desktop: two separate cards side by side */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-4 md:gap-6">
            <Link
              href="/symptoms"
              className="card card-link !py-4 !px-4 sm:!p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
            >
              <div className="flex items-center sm:flex-col sm:items-center gap-3 sm:gap-3">
                <div className="w-10 h-10 bg-emerald-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                  <Thermometer className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-white" />
                </div>
                <div className="flex-1 sm:w-full sm:text-center">
                  <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed sm:justify-center">
                    Log Symptoms
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0 text-secondary sm:hidden" />
              </div>
              <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto">
                  Record how you're feeling and track your symptoms
                </div>
              </div>
            </Link>
            <Link
              href="/medications/track"
              className="card card-link !py-4 !px-4 sm:!p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
            >
              <div className="flex items-center sm:flex-col sm:items-center gap-3 sm:gap-3">
                <div className="w-10 h-10 bg-pink-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                  <ChartLine className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-white" />
                </div>
                <div className="flex-1 sm:w-full sm:text-center">
                  <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed sm:justify-center">
                    Track Medications
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0 text-secondary sm:hidden" />
              </div>
              <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto">
                  Log missed medications and track your adherence
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Today's Summary */}
          <div className="order-2 lg:order-1">
            <h2 className="text-xl font-semibold font-source text-primary mb-3">Today's Summary</h2>
            <div className="card">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-primary">Symptoms Logged</span>
                <span className="text-sm font-semibold text-primary">{todaySymptoms.length}</span>
              </div>
              <div className="border-t border-[var(--border-card-inner)] my-0" aria-hidden="true" />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-primary">Medications Taken</span>
                <span className="text-sm font-semibold text-primary">{takenMedications.length}/{medications.length}</span>
              </div>
            </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="order-1 lg:order-2">
            <h2 className="text-xl font-semibold font-source text-primary mb-3">Recent Activity</h2>
            <div className="card">
            <div className="card-inner p-4 sm:p-6 transition-all duration-300 ease-in-out">
              {(() => {
              // Helper function to format relative time
              const formatRelativeTime = (date) => {
                        const now = new Date()
                const diffMinutes = Math.floor((now - date) / (1000 * 60))
                        const diffHours = Math.floor(diffMinutes / 60)
                        
                        if (diffMinutes < 1) return 'Just now'
                        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
                        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                        const diffDays = Math.floor(diffHours / 24)
                        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
                return date.toLocaleDateString()
              }

              // Collect all activities with timestamps
              const activities = []
              
              // Most recent symptom entry
              if (symptoms.length > 0) {
                const lastSymptom = symptoms[0]
                activities.push({
                  type: 'symptom',
                  timestamp: new Date(lastSymptom.created_at || lastSymptom.createdAt),
                  title: "Completed Today's goal \"Log Symptoms\"",
                  icon: Thermometer,
                  iconBg: 'bg-emerald-100',
                  iconColor: 'text-emerald-600'
                })
              }

              // Symptom deleted
              if (symptomDeleted) {
                activities.push({
                  type: 'deleted-symptom',
                  timestamp: new Date(symptomDeleted.timestamp),
                  title: 'Deleted symptom entry',
                  icon: Thermometer,
                  iconBg: 'bg-emerald-100',
                  iconColor: 'text-emerald-600'
                })
              }

              // Most recent tracked medication entry
              if (trackedMedications.length > 0) {
                const lastMedication = trackedMedications[0]
                activities.push({
                  type: 'tracked-medication',
                  timestamp: new Date(lastMedication.created_at || lastMedication.createdAt),
                  title: "Completed Today's goal \"Track Medications\"",
                  icon: ChartLine,
                  iconBg: 'bg-pink-100',
                  iconColor: 'text-pink-600'
                })
              }

              // Tracked medication deleted
              if (trackedMedicationDeleted) {
                activities.push({
                  type: 'deleted-tracked-medication',
                  timestamp: new Date(trackedMedicationDeleted.timestamp),
                  title: 'Deleted tracked medication',
                  icon: ChartLine,
                  iconBg: 'bg-pink-100',
                  iconColor: 'text-pink-600'
                })
              }

              // Individual medication takings (only if not all medications are taken)
              // Check if all medication IDs are in takenMedications
              const medicationIds = medications.map(m => m.id.toString())
              const allMedsTaken = medicationsCompletedAt && 
                medications.length > 0 && 
                medicationIds.every(id => takenMedications.includes(id))
              if (!allMedsTaken && individualMedicationTakings.length > 0) {
                individualMedicationTakings.forEach((taking) => {
                  activities.push({
                    type: 'taken-medication',
                    timestamp: new Date(taking.timestamp),
                    title: `Taken ${taking.medicationName}`,
                    icon: Pill,
                    iconBg: 'bg-purple-100',
                    iconColor: 'text-purple-600'
                  })
                })
              }

              // Medication updated
              if (medicationUpdated) {
                activities.push({
                  type: 'updated-medication',
                  timestamp: new Date(medicationUpdated.timestamp),
                  title: `Updated ${medicationUpdated.oldMedicationName} to ${medicationUpdated.newMedicationName}`,
                  icon: Pill,
                  iconBg: 'bg-purple-100',
                  iconColor: 'text-purple-600'
                })
              }

              // Medication deleted
              if (medicationDeleted) {
                activities.push({
                  type: 'deleted-medication',
                  timestamp: new Date(medicationDeleted.timestamp),
                  title: `Deleted ${medicationDeleted.medicationName}`,
                  icon: Pill,
                  iconBg: 'bg-purple-100',
                  iconColor: 'text-purple-600'
                })
              }

              // Medication added (from DB so it syncs across devices)
              const fourHoursAgoForAdded = new Date(Date.now() - 4 * 60 * 60 * 1000)
              if (Array.isArray(medications) && medications.length > 0) {
                medications.forEach((med) => {
                  const created = med.createdAt || med.created_at
                  if (created && new Date(created) >= fourHoursAgoForAdded) {
                    activities.push({
                      type: 'added-medication',
                      timestamp: new Date(created),
                      title: `Added ${med.name || 'medication'}`,
                      icon: Pill,
                      iconBg: 'bg-purple-100',
                      iconColor: 'text-purple-600'
                    })
                  }
                })
              }

              // Most recent weight entry (only when they added a new entry; if they updated today we show "Updated weight entry" instead)
              if (weightEntries.length > 0 && !weightUpdated) {
                const lastWeight = weightEntries[0]
                activities.push({
                  type: 'weight',
                  timestamp: new Date(lastWeight.created_at),
                  title: `Logged weight: ${Number(lastWeight.value_kg)} kg`,
                  icon: Scale,
                  iconBg: 'bg-indigo-100',
                  iconColor: 'text-indigo-600'
                })
              }

              // Weight deleted
              if (weightDeleted) {
                activities.push({
                  type: 'deleted-weight',
                  timestamp: new Date(weightDeleted.timestamp),
                  title: 'Deleted weight entry',
                  icon: Scale,
                  iconBg: 'bg-indigo-100',
                  iconColor: 'text-indigo-600'
                })
              }

              // Weight updated
              if (weightUpdated) {
                activities.push({
                  type: 'updated-weight',
                  timestamp: new Date(weightUpdated.timestamp),
                  title: 'Updated weight entry',
                  icon: Scale,
                  iconBg: 'bg-indigo-100',
                  iconColor: 'text-indigo-600'
                })
              }

              // Appointment added
              if (appointmentAdded) {
                activities.push({
                  type: 'added-appointment',
                  timestamp: new Date(appointmentAdded.timestamp),
                  title: appointmentAdded.type ? `Added appointment: ${appointmentAdded.type}` : 'Added appointment',
                  icon: Calendar,
                  iconBg: 'bg-sky-100',
                  iconColor: 'text-sky-600'
                })
              }

              // Appointment updated
              if (appointmentUpdated) {
                activities.push({
                  type: 'updated-appointment',
                  timestamp: new Date(appointmentUpdated.timestamp),
                  title: 'Updated appointment',
                  icon: Calendar,
                  iconBg: 'bg-sky-100',
                  iconColor: 'text-sky-600'
                })
              }

              // Appointment deleted
              if (appointmentDeleted) {
                activities.push({
                  type: 'deleted-appointment',
                  timestamp: new Date(appointmentDeleted.timestamp),
                  title: 'Deleted appointment',
                  icon: Calendar,
                  iconBg: 'bg-sky-100',
                  iconColor: 'text-sky-600'
                })
              }

              // All medications taken
              if (allMedsTaken) {
                activities.push({
                  type: 'all-medications-taken',
                  timestamp: new Date(medicationsCompletedAt),
                  title: "Completed Today's goal \"Take Medications\"",
                  icon: Pill,
                  iconBg: 'bg-purple-100',
                  iconColor: 'text-purple-600'
                })
              }

              // Filter to last 4 hours and sort by timestamp (most recent first)
              const now = new Date()
              const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000)) // 4 hours in milliseconds
              
              const recentActivities = activities
                .filter(activity => activity.timestamp >= fourHoursAgo)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 3) // Limit to 3 most recent

              if (recentActivities.length === 0) {
                return (
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      <Clock className="w-10 h-10 text-primary opacity-40" />
                    </div>
                    <p className="text-primary text-sm leading-relaxed">No recent activity</p>
                    <p className="text-xs text-primary mt-1 leading-relaxed opacity-80">Start tracking your symptoms and medications to see activity here</p>
                    </div>
                )
              }

              return (
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => {
                    return (
                      <div key={`${activity.type}-${activity.timestamp.getTime()}-${index}`} className="flex items-start gap-3 pt-2 min-w-0 overflow-hidden">
                        <Activity className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }} />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p
                            className="text-sm font-medium text-primary min-w-0 line-clamp-2 overflow-hidden"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                            title={activity.title}
                          >
                            {activity.title}
                          </p>
                          <p className="text-xs text-slate-400 dark:[color:var(--text-tertiary)] mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
              )
            })()}
            </div>
            </div>
          </div>
        </div>

        {/* Latest News */}
        {isAuthenticated && (
          <div className="my-6">
            <h2 className="text-xl font-semibold font-source text-primary mb-4">
              Latest News
            </h2>
            {newsLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5F9EA0]"></div>
              </div>
            )}
            {newsError && !newsLoading && (
              <div className="card">
                <div className="card-inner p-8 text-center">
                  <p className="text-primary">Unable to load news. Try again later.</p>
                </div>
              </div>
            )}
            {!newsLoading && !newsError && newsItems.length === 0 && (
              <div className="card">
                <div className="card-inner p-8 text-center">
                  <p className="text-primary">No news available.</p>
                </div>
              </div>
            )}
            {!newsLoading && !newsError && newsItems.length > 0 && (
                <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div
                    ref={newsScrollRef}
                    className="overflow-x-auto pb-2 scrollbar-hide"
                  >
                    <div className="flex gap-4 md:gap-6 md:px-0" style={{ width: 'max-content' }}>
                    {newsItems.map((item) => (
                              <a
                                key={item.link}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden group hover:shadow-lg transition-all duration-200 flex-shrink-0 w-[260px] sm:w-[280px] sm:rounded-xl"
                              >
                                <div className="flex flex-col h-full">
                                  <div className="w-full aspect-[4/3] flex-shrink-0 bg-[var(--bg-card)] overflow-hidden relative">
                                    <div
                                      className="w-full h-full flex items-center justify-center absolute inset-0"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(95, 158, 160, 0.15) 0%, rgba(95, 158, 160, 0.05) 100%)'
                                      }}
                                      aria-hidden
                                    >
                                      <Newspaper className="w-10 h-10 opacity-40" style={{ color: 'var(--text-cadet-blue)' }} />
                                    </div>
                                    {item.imageUrl ? (
                                      <img
                                        src={`/api/image-proxy?url=${encodeURIComponent(item.imageUrl)}`}
                                        alt=""
                                        className="w-full h-full object-cover absolute inset-0 z-10"
                                        loading="lazy"
                                        onError={() => {
                                          setNewsItems((prev) =>
                                            prev.map((i) => (i.link === item.link ? { ...i, imageUrl: null } : i))
                                          )
                                        }}
                                      />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0 pt-4 px-4 pb-4 sm:px-6 sm:pb-6 bg-[var(--bg-card)] sm:rounded-b-xl">
                                    <h3 className="font-semibold text-sm text-primary group-hover:text-[#5F9EA0] transition-colors line-clamp-2 leading-normal">
                                      {item.headline || item.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {item.source && (
                                        <span className="text-xs font-medium py-0.5 rounded" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-cadet-blue)' }}>
                                          {item.source}
                                        </span>
                                      )}
                                      {item.pubDate && (
                                        <span className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">
                                          {new Date(item.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ))}
                    </div>
                  </div>
                  {!newsAtStart && (
                    <div className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          newsScrollRef.current?.scrollBy({ left: -592, behavior: 'smooth' })
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 bg-[var(--bg-card)] dark:bg-[var(--bg-card-inner)] text-[var(--text-cadet-blue)] dark:text-white"
                        aria-label="Previous articles"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                  {!newsAtEnd && (
                    <div className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          newsScrollRef.current?.scrollBy({ left: 592, behavior: 'smooth' })
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 bg-[var(--bg-card)] dark:bg-[var(--bg-card-inner)] text-[var(--text-cadet-blue)] dark:text-white"
                        aria-label="Next articles"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>
            )}
          </div>
        )}

        {/* Recent Symptoms */}
        {displayedSymptoms.length > 0 && (
          <div className="mb-4 sm:mb-6 card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-start gap-3">
                <h2 className="text-xl font-semibold font-source text-primary">Recent Logged Symptoms</h2>
              </div>
              {symptoms.length > 1 && (
                <button 
                  onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                  className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 flex items-center gap-1"
                >
                  <span className="hidden sm:inline text-sm font-medium">{showAllSymptoms ? 'Show Less' : 'View All'}</span>
                  <ChevronDown className={`w-5 h-5 sm:hidden transition-transform duration-200 text-primary ${showAllSymptoms ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            <div className="space-y-3 max-w-xs">
              {displayedSymptoms.map((symptom) => (
                <div key={symptom.id}>
                <div 
                    className="card-inner p-4 sm:p-6 cursor-pointer transition-all duration-200"
                  onClick={() => {
                    router.push(`/symptoms/${symptom.id}`)
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {formatUKDate(symptom.created_at || symptom.createdAt)}
                      </span>
                      <span className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">
                        {new Date(symptom.created_at || symptom.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-primary opacity-80">
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
          <div className="mb-6 sm:mb-6 card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-start gap-3">
                <h2 className="text-xl font-semibold font-source text-primary">Recent Tracked Medications</h2>
              </div>
              {trackedMedications.length > 1 && (
                <button 
                  onClick={() => setShowAllMedications(!showAllMedications)}
                  className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 flex items-center gap-1"
                >
                  <span className="hidden sm:inline text-sm font-medium">{showAllMedications ? 'Show Less' : 'View All'}</span>
                  <ChevronDown className={`w-5 h-5 sm:hidden transition-transform duration-200 text-primary ${showAllMedications ? 'rotate-180' : ''}`} />
                </button>
              )}
                  </div>
            <div className="space-y-3 max-w-xs">
              {(showAllMedications ? trackedMedications : trackedMedications.slice(0, 1)).map((tracked, index) => (
                <div key={tracked.id}>
                  <div 
                    className="card-inner p-4 sm:p-6 cursor-pointer transition-all duration-200"
                    onClick={() => {
                      router.push(`/medications/track/${tracked.id}`)
                    }}
                  >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {formatUKDate(tracked.created_at || tracked.createdAt)}
                      </span>
                      <span className="text-xs text-slate-400 dark:[color:var(--text-tertiary)]">
                        {new Date(tracked.created_at || tracked.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-primary opacity-80">
                      <span>View details</span>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Options */}
        <div className="mb-6 xl:mb-0">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">More</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 min-w-0">
              <Link
                href="/medications"
                className="card card-link !p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 min-w-0"
              >
                <div className="flex flex-col items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-purple-600 dark:text-white" />
                </div>
                  <div className="w-full text-center min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed break-words">
                      My Meds
                    </h3>
                  </div>
                </div>
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto w-full">
                    Add and manage your prescribed medications
                  </div>
                </div>
              </Link>

              <Link
                href="/reports"
                className="card card-link !p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 min-w-0"
              >
                <div className="flex flex-col items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-orange-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-white" />
                  </div>
                  <div className="w-full text-center min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed break-words">
                      Reports
                    </h3>
                  </div>
                </div>
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto w-full">
                    View insights and share data with your doctor
                  </div>
                </div>
              </Link>

              <Link
                href="/weight"
                className="card card-link !p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 min-w-0"
              >
                <div className="flex flex-col items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-indigo-600 dark:text-white" />
                  </div>
                  <div className="w-full text-center min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed break-words">
                      My Weight
                    </h3>
                  </div>
                </div>
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto w-full">
                    Keep track of your weight for your appointments
                  </div>
                </div>
              </Link>

              <Link
                href="/appointments"
                className="card card-link !p-6 transition-all group relative focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 min-w-0"
              >
                <div className="flex flex-col items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-sky-100 dashboard-icon-panel rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-sky-600 dark:text-white" />
                  </div>
                  <div className="w-full text-center min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-primary leading-tight sm:leading-relaxed break-words">
                      <span className="min-[376px]:hidden">Apts</span>
                      <span className="hidden min-[376px]:inline">Appointments</span>
                    </h3>
                  </div>
                </div>
                <div className="pointer-events-none absolute right-3 -top-14 hidden w-52 sm:group-hover:flex sm:group-focus-visible:flex">
                  <div className="tooltip-card rounded-lg px-4 py-3 text-left text-xs text-secondary leading-snug shadow-lg font-roboto w-full">
                    View and manage your upcoming healthcare appointments
                  </div>
                </div>
              </Link>

          </div>
        </div>

        </div>
        </div>
        </div>
      </div>
    </div>
  )
}
