'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase, deleteFromSupabase, TABLES } from '@/lib/supabase'
import { getUserPreferences } from '@/lib/userPreferences'
import ProtectedRoute from '@/components/ProtectedRoute'

function getMealFields(meal) {
  if (typeof meal === 'string') {
    return { food: meal, quantity: '' }
  }
  return {
    food: typeof meal?.food === 'string' ? meal.food : '',
    quantity: typeof meal?.quantity === 'string' ? meal.quantity.trim() : ''
  }
}

/** Same row pattern as Details (label left, value right); food can wrap; quantity aligns right. */
function MealDetailRow({ food, quantity }) {
  return (
    <div className="flex justify-between items-start gap-4 min-w-0 overflow-hidden py-1 sm:py-2">
      <span className="text-sm sm:text-base text-secondary font-sans min-w-0 flex-1 break-words" title={food}>
        {food}
      </span>
      {quantity ? (
        <span
          className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 text-right [overflow-wrap:anywhere] shrink-0 max-w-[45%] sm:max-w-[50%]"
          title={quantity}
        >
          {quantity}
        </span>
      ) : null}
    </div>
  )
}

function SymptomDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [symptom, setSymptom] = useState(null)
  const [userPreferences, setUserPreferences] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Fetch symptoms directly from Supabase
  useEffect(() => {
    const fetchSymptoms = async () => {
      if (!user?.id) {
        setSymptoms([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.LOG_SYMPTOMS)
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
  }, [user?.id])

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user?.id) {
        setUserPreferences(null)
        return
      }
      const prefs = await getUserPreferences(user.id)
      setUserPreferences(prefs)
    }
    fetchPrefs()
  }, [user?.id])

  useEffect(() => {
    const foundSymptom = symptoms.find(s => s.id === params.id)
    if (foundSymptom) {
      setSymptom(foundSymptom)
    } else if (symptoms.length > 0 && !isRedirecting) {
      // Only redirect if we have symptoms but didn't find this one and we're not already redirecting
      router.push('/')
    }
    // If symptoms array is empty, wait for it to load
  }, [symptoms, params.id, router, isRedirecting])

  const handleDelete = async () => {
    if (!symptom || !user) return
    
    setIsDeleting(true)
    try {
      const result = await deleteFromSupabase(TABLES.LOG_SYMPTOMS, symptom.id, user.id)
      
      if (result.success) {
        // Set redirecting flag to prevent useEffect redirect
        setIsRedirecting(true)
        
        // Remove from local state
        const updatedSymptoms = symptoms.filter(s => s.id !== symptom.id)
        setSymptoms(updatedSymptoms)
        
        // Store deletion activity for Recent Activity
        const today = new Date().toISOString().split('T')[0]
        const deletedKey = `flarecare-symptom-deleted-${user.id}-${today}`
        localStorage.setItem(deletedKey, JSON.stringify({
          timestamp: new Date().toISOString()
        }))
        
        // Dispatch custom event to notify dashboard
        window.dispatchEvent(new Event('symptom-deleted'))
        
        // Set delete toast flag and redirect to dashboard
        localStorage.setItem('showDeleteToast', 'true')
        router.push('/')
      } else {
        console.error('Failed to delete symptom:', result.error)
        alert('Failed to delete symptom entry. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting symptom:', error)
      alert('Failed to delete symptom entry. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (!symptom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008B8B] mx-auto"></div>
          <p className="mt-4 text-primary">Loading...</p>
        </div>
      </div>
    )
  }

  // Only separate "Smoked" from content below when another Details row follows (avoids orphan line when e.g. smoked but did not drink on symptom day).
  const hasLifestyleRowsAfterSmoked =
    typeof symptom.drank_on_symptom_day !== 'boolean' ||
    !!(symptom.alcohol === true && (symptom.average_alcohol_units_pw || symptom.alcohol_habits)) ||
    (typeof symptom.drank_on_symptom_day === 'boolean' &&
      symptom.drank_on_symptom_day === true &&
      !!symptom.alcohol_units_on_symptom_day)

  // Only separate "Alcohol units consumed" precursor rows when day-units row exists; symmetric fix for "drank but did not smoke" leaving no row below.
  const hasRowAfterAverageAlcohol =
    typeof symptom.drank_on_symptom_day === 'boolean' &&
    symptom.drank_on_symptom_day === true &&
    !!symptom.alcohol_units_on_symptom_day

  const hasLifestyleRowsAfterBathroomDescription =
    typeof symptom.smoked_on_symptom_day !== 'boolean' ||
    !!(symptom.smoker === true && (symptom.smoking_habits || symptom.smoking_details)) ||
    (typeof symptom.smoked_on_symptom_day === 'boolean' &&
      symptom.smoked_on_symptom_day === true &&
      !!symptom.smoked_amount_on_symptom_day) ||
    typeof symptom.drank_on_symptom_day !== 'boolean' ||
    !!(symptom.alcohol === true && (symptom.average_alcohol_units_pw || symptom.alcohol_habits)) ||
    (typeof symptom.drank_on_symptom_day === 'boolean' &&
      symptom.drank_on_symptom_day === true &&
      !!symptom.alcohol_units_on_symptom_day)

  return (
    <div className="w-full sm:px-4 md:px-6 min-w-0 overflow-hidden">
      <div className="max-w-4xl w-full mx-auto min-w-0">
        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Overview */}
          <div className="card min-w-0 overflow-hidden">
            <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b" style={{ borderColor: 'var(--separator-card)' }}>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary">
                  Symptom log
                </h1>
                <p className="text-sm text-tertiary font-sans mt-1 sm:mt-2">
                  {new Date(symptom.created_at || symptom.createdAt).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })} at {new Date(symptom.created_at || symptom.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                className="p-2.5 rounded-lg text-red-600 dark:[color:var(--text-trash)] sm:hover:bg-red-500/10 sm:dark:hover:bg-[var(--bg-card-inner)] focus:outline-none disabled:opacity-50 transition-colors flex-shrink-0"
                title="Delete entry"
                aria-label="Delete entry"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6">
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Status</span>
                  <p className={`mt-1 sm:mt-2 text-sm sm:text-base font-semibold font-sans ${(symptom.isOngoing || !symptom.symptomEndDate) ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {symptom.isOngoing || !symptom.symptomEndDate ? 'Ongoing' : 'Resolved'}
                  </p>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Severity</span>
                  <p
                    className={`mt-1 sm:mt-2 text-sm sm:text-base font-semibold font-sans ${
                      (symptom.severity ?? null) !== null
                        ? 'text-red-600 dark:text-primary'
                        : 'text-secondary'
                    }`}
                  >
                    {symptom.severity ?? 'Not logged'}
                  </p>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Stress level</span>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold text-primary font-sans">
                    {symptom.stress_level ?? 'Not logged'}
                  </p>
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
              {/* Bathroom & Lifestyle */}
              <div className="card min-w-0 overflow-hidden">
                <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Details</h2>
                <div className="space-y-0 [&>*:last-child]:pb-0">
                <div className="flex justify-between items-center gap-4 pt-0 pb-4 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                  <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Bathroom frequency</span>
                  <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">{symptom.normal_bathroom_frequency || 'Not set'} times/day</span>
                </div>
                {symptom.bathroom_frequency_changed && (
                  <>
                    <div className={`flex justify-between items-center gap-4 py-4 min-w-0 overflow-hidden ${symptom.bathroom_frequency_changed !== 'yes' || !symptom.bathroom_frequency_change_details ? 'border-b' : ''}`} style={{ borderColor: 'var(--separator-card)' }}>
                      <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Frequency changed</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">{symptom.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</span>
                    </div>
                    {symptom.bathroom_frequency_changed === 'yes' && symptom.bathroom_frequency_change_details && (
                      <div
                        className={`py-4 min-w-0 overflow-hidden ${hasLifestyleRowsAfterBathroomDescription ? 'border-b' : ''}`}
                        style={{ borderColor: 'var(--separator-card)' }}
                      >
                        <span className="text-sm sm:text-base font-medium text-primary block mb-2 font-sans">Description</span>
                        <p className="text-sm sm:text-base text-secondary leading-relaxed font-sans break-words" title={symptom.bathroom_frequency_change_details}>{symptom.bathroom_frequency_change_details}</p>
                      </div>
                    )}
                  </>
                )}
                {typeof symptom.smoked_on_symptom_day !== 'boolean' && (
                  <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Smoker</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">
                      {symptom.smoker === true
                        ? 'Yes'
                        : symptom.smoker === false
                          ? 'No'
                          : 'Not recorded'}
                    </span>
                  </div>
                )}
                {symptom.smoker === true && (symptom.smoking_habits || symptom.smoking_details) && (
                  <div className="py-4 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary block mb-2 font-sans">Smoking habits</span>
                    <p className="text-sm sm:text-base font-medium text-primary leading-relaxed font-sans break-words" title={symptom.smoking_habits || symptom.smoking_details}>{symptom.smoking_habits || symptom.smoking_details}</p>
                  </div>
                )}
                {typeof symptom.smoked_on_symptom_day === 'boolean' && symptom.smoked_on_symptom_day === true && symptom.smoked_amount_on_symptom_day && (
                  <div
                    className={`flex justify-between items-center gap-4 py-4 min-w-0 overflow-hidden ${hasLifestyleRowsAfterSmoked ? 'border-b' : ''}`}
                    style={{ borderColor: 'var(--separator-card)' }}
                  >
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Smoked</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">{symptom.smoked_amount_on_symptom_day}</span>
                  </div>
                )}
                {typeof symptom.drank_on_symptom_day !== 'boolean' && (
                  <div className={`flex justify-between items-center gap-4 py-4 ${(symptom.alcohol === true && (symptom.average_alcohol_units_pw || symptom.alcohol_habits)) ? 'border-b' : ''} min-w-0 overflow-hidden`} style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Alcohol</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">
                      {symptom.alcohol === true
                        ? 'Yes'
                        : symptom.alcohol === false
                          ? 'No'
                          : 'Not recorded'}
                    </span>
                  </div>
                )}
                {symptom.alcohol === true && (symptom.average_alcohol_units_pw || symptom.alcohol_habits) && (
                  <div
                    className={`flex justify-between items-center gap-4 py-4 min-w-0 overflow-hidden ${hasRowAfterAverageAlcohol ? 'border-b' : ''}`}
                    style={{ borderColor: 'var(--separator-card)' }}
                  >
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Average Alcohol Units</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">{symptom.average_alcohol_units_pw || symptom.alcohol_habits} units/week</span>
                  </div>
                )}
                {typeof symptom.drank_on_symptom_day === 'boolean' && symptom.drank_on_symptom_day === true && symptom.alcohol_units_on_symptom_day && (
                  <div className="flex justify-between items-center gap-4 py-4 min-w-0 overflow-hidden">
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Alcohol Units Consumed</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 break-words text-right">{symptom.alcohol_units_on_symptom_day} units</span>
                  </div>
                )}
              </div>
              </div>

              {/* Meals */}
              {(symptom.breakfast?.length > 0 || symptom.lunch?.length > 0 || symptom.dinner?.length > 0) && (
                <div className="card min-w-0 overflow-hidden">
                  <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Meals</h2>
                  <div className="space-y-3 sm:space-y-4">
                  {symptom.breakfast?.length > 0 && (
                    <div
                      className={`min-w-0 ${symptom.lunch?.length > 0 ? 'pb-3 sm:pb-4 border-b' : ''}`}
                      style={{ borderColor: 'var(--separator-card)' }}
                    >
                      <h3 className="text-sm sm:text-base font-medium text-primary mb-1 sm:mb-2 font-sans">Breakfast</h3>
                      {symptom.breakfast.map((meal, index) => {
                        const { food, quantity } = getMealFields(meal)
                        return <MealDetailRow key={index} food={food} quantity={quantity} />
                      })}
                    </div>
                  )}
                  {symptom.lunch?.length > 0 && (
                    <div
                      className={`min-w-0 ${symptom.dinner?.length > 0 ? 'pb-3 sm:pb-4 border-b' : ''}`}
                      style={{ borderColor: 'var(--separator-card)' }}
                    >
                      <h3 className="text-sm sm:text-base font-medium text-primary mb-1 sm:mb-2 font-sans">Lunch</h3>
                      {symptom.lunch.map((meal, index) => {
                        const { food, quantity } = getMealFields(meal)
                        return <MealDetailRow key={index} food={food} quantity={quantity} />
                      })}
                    </div>
                  )}
                  {symptom.dinner?.length > 0 && (
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-medium text-primary mb-1 sm:mb-2 font-sans">Dinner</h3>
                      {symptom.dinner.map((meal, index) => {
                        const { food, quantity } = getMealFields(meal)
                        return <MealDetailRow key={index} food={food} quantity={quantity} />
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {symptom.notes && (
                <div className="card min-w-0 overflow-hidden">
                  <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Notes</h2>
                  <p className="text-sm sm:text-base text-secondary leading-relaxed font-sans break-words" title={symptom.notes}>{symptom.notes}</p>
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-4 sm:space-y-6 lg:sticky lg:top-4">
              {/* Timeline */}
              <div className="card min-w-0 overflow-hidden">
                <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Timeline</h2>
                <div>
                  <div className={`flex items-center justify-between gap-4 min-w-0 overflow-hidden ${!symptom.isOngoing && symptom.symptomEndDate ? 'pb-4 border-b' : ''}`} style={{ borderColor: 'var(--separator-card)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm sm:text-base text-secondary font-sans">Started</span>
                    </div>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">
                      {symptom.symptomStartDate ? new Date(symptom.symptomStartDate).toLocaleDateString() : (symptom.created_at || symptom.createdAt ? new Date(symptom.created_at || symptom.createdAt).toLocaleDateString() : 'Not set')}
                    </span>
                  </div>
                  {!symptom.isOngoing && symptom.symptomEndDate && (
                    <div className="flex items-center justify-between gap-4 pt-4 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm sm:text-base text-secondary font-sans">Ended</span>
                      </div>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans">{new Date(symptom.symptomEndDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <p className="text-sm text-secondary leading-relaxed">
                  <span className="font-semibold text-primary font-title">Note:</span> This log shows what you reported on the day your symptoms started, not for every day of the symptom duration.
                </p>
              </div>
            </aside>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-md mx-4 border" style={{backgroundColor: 'var(--bg-dropdown)', borderColor: 'var(--border-dropdown)'}}>
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Delete Symptom Entry</h3>
            </div>
            <p className="text-[15px] sm:text-base text-secondary mb-6">
              Are you sure you want to delete this symptom log? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 button-cancel disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 button-delete disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SymptomDetailPage() {
  return (
    <ProtectedRoute>
      <SymptomDetailContent />
    </ProtectedRoute>
  )
}