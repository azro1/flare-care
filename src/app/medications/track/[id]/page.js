'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/AuthContext'
import { supabase, deleteFromSupabase, TABLES } from '@/lib/supabase'

function TrackedMedicationDetails() {
  const router = useRouter()
  const { user } = useAuth()
  const [trackedData, setTrackedData] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const fetchTrackedMedication = async () => {
      if (!user?.id || isRedirecting) return
      
      const medicationId = window.location.pathname.split('/').pop()
      
      try {
        const { data, error } = await supabase
          .from(TABLES.TRACK_MEDICATIONS)
          .select('*')
          .eq('id', medicationId)
          .eq('user_id', user.id)
          .single()

        if (error) {
          // If record not found (PGRST116) or any other error, redirect
          if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
            // Record doesn't exist, redirect to dashboard
            if (!isRedirecting) {
              router.push('/')
            }
            return
          }
          throw error
        }

        if (data) {
          setTrackedData(data)
        } else if (!isRedirecting) {
          // If not found, redirect to dashboard
          router.push('/')
        }
      } catch (error) {
        // Only log if it's not a "not found" error
        if (error.code !== 'PGRST116' && !error.message?.includes('No rows')) {
          console.error('Error fetching tracked medication:', error)
        }
        if (!isRedirecting) {
          router.push('/')
        }
      }
    }

    if (typeof window !== 'undefined') {
      fetchTrackedMedication()
    }
  }, [user?.id, router, isRedirecting])

  const handleDelete = async () => {
    if (!trackedData || !user) return
    
    setIsDeleting(true)
    try {
      const result = await deleteFromSupabase(TABLES.TRACK_MEDICATIONS, trackedData.id, user.id)
      
      if (result.success) {
        // Set redirecting flag to prevent useEffect redirect
        setIsRedirecting(true)
        
        // Store deletion activity for Recent Activity
        const today = new Date().toISOString().split('T')[0]
        const deletedKey = `flarecare-tracked-medication-deleted-${user.id}-${today}`
        localStorage.setItem(deletedKey, JSON.stringify({
          timestamp: new Date().toISOString()
        }))
        
        // Dispatch custom event to notify dashboard
        window.dispatchEvent(new Event('tracked-medication-deleted'))
        
        // Set delete toast flag and redirect to dashboard
        localStorage.setItem('showMedicationDeleteToast', 'true')
        router.push('/')
      } else {
        console.error('Failed to delete medication:', result.error)
        alert('Failed to delete medication entry. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting medication:', error)
      alert('Failed to delete medication entry. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (!trackedData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const missedCount = trackedData.missed_medications_list?.length ?? 0
  const nsaidCount = trackedData.nsaid_list?.length ?? 0
  const antibioticCount = trackedData.antibiotic_list?.length ?? 0

  return (
    <div>
      <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 min-w-0">
      <button
        onClick={() => router.back()}
        className="mb-6 text-cadet-blue hover:text-cadet-blue/80 hover:underline text-base font-medium flex items-center"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
        <h1 className="text-2xl sm:text-3xl font-bold font-source text-primary">
          Medication Tracking Details
        </h1>
      </div>

      <div className="mb-6">
        <p className="text-secondary">
          {new Date(trackedData.created_at || trackedData.createdAt).toLocaleDateString('en-GB', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })} at {new Date(trackedData.created_at || trackedData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold font-source text-primary mb-6">Overview</h2>
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6">
            <div className="card-inner rounded-xl p-4">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wide block">Missed doses</span>
              <p className={`mt-2 text-base font-semibold ${missedCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-secondary'}`}>
                {missedCount > 0 ? missedCount : 'None logged'}
              </p>
            </div>

            <div className="card-inner rounded-xl p-4">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wide block">NSAIDs</span>
              <p className={`mt-2 text-base font-semibold ${nsaidCount > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-secondary'}`}>
                {nsaidCount > 0 ? nsaidCount : 'None logged'}
              </p>
            </div>

            <div className="card-inner rounded-xl p-4">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wide block">Antibiotics</span>
              <p className={`mt-2 text-base font-semibold ${antibioticCount > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-secondary'}`}>
                {antibioticCount > 0 ? antibioticCount : 'None logged'}
              </p>
            </div>
          </div>
        </div>

        {/* Missed Medications */}
        {trackedData.missed_medications_list && trackedData.missed_medications_list.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-primary mb-4">Missed Medications</h2>
            <div className="space-y-6">
              {trackedData.missed_medications_list.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="card-inner rounded-xl p-4">
                    <div className="flex justify-between pb-4 border-b border-slate-300/30 dark:border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-slate-300/30 dark:border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">
                        {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-4">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NSAIDs */}
        {trackedData.nsaid_list && trackedData.nsaid_list.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-primary mb-4">NSAIDs</h2>
            <div className="space-y-6">
              {trackedData.nsaid_list.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="card-inner rounded-xl p-4">
                    <div className="flex justify-between pb-4 border-b border-slate-300/30 dark-border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-slate-300/30 dark:border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-slate-300/30 dark:border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-4">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Antibiotics */}
        {trackedData.antibiotic_list && trackedData.antibiotic_list.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-primary mb-4">Antibiotics</h2>
            <div className="space-y-6">
              {trackedData.antibiotic_list.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="card-inner rounded-xl p-4">
                    <div className="flex justify-between pb-4 border-b border-slate-300/30 dark:border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-slate-300/30 dark-border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-slate-300/30 dark-border-b" style={{borderColor: 'var(--border-card-inner)'}}>
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-4">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom delete action (all screens) */}
      <div className="mt-8">
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="w-full button-delete border border-red-600 focus:outline-none disabled:opacity-50 font-semibold"
        >
          {isDeleting ? 'Deleting...' : 'Delete entry'}
        </button>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 border border-slate-300/50 dark:border dark:bg-[var(--bg-secondary)]" style={{borderColor: 'var(--border-primary)'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Delete Medication Entry</h3>
            </div>
            
            <p className="text-secondary mb-6">
              Are you sure you want to delete this medication tracking entry? This action cannot be undone.
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

export default function TrackedMedicationDetailsPage() {
  return (
    <ProtectedRoute>
      <TrackedMedicationDetails />
    </ProtectedRoute>
  )
}

