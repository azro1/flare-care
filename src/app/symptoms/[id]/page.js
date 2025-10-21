'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDataSync } from '@/lib/useDataSync'
import { useAuth } from '@/lib/AuthContext'
import { deleteFromSupabase, TABLES } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Pizza } from 'lucide-react'

function SymptomDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { data: symptoms, setData: setSymptoms } = useDataSync('flarecare-symptoms', [])
  const [symptom, setSymptom] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const foundSymptom = symptoms.find(s => s.id === params.id)
    if (foundSymptom) {
      setSymptom(foundSymptom)
    } else if (symptoms.length > 0 && !isRedirecting) {
      // Only redirect if we have symptoms but didn't find this one and we're not already redirecting
      router.push('/symptoms')
    }
    // If symptoms array is empty, wait for it to load
  }, [symptoms, params.id, router, isRedirecting])

  const handleDelete = async () => {
    if (!symptom || !user) return
    
    setIsDeleting(true)
    try {
      const result = await deleteFromSupabase(TABLES.SYMPTOMS, symptom.id, user.id)
      
      if (result.success) {
        // Set redirecting flag to prevent useEffect redirect
        setIsRedirecting(true)
        
        // Remove from local state
        const updatedSymptoms = symptoms.filter(s => s.id !== symptom.id)
        setSymptoms(updatedSymptoms)
        
        // Redirect to dashboard
        router.push('/')
      } else {
        console.error('Failed to delete symptom:', result.error)
        alert('Failed to delete symptom. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting symptom:', error)
      alert('Failed to delete symptom. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (!symptom) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008B8B] mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-300 hover:text-white hover:underline transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
          
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-white mb-2 sm:mb-4">
              Symptom Entry
            </h1>
            <p className="text-base sm:text-lg font-roboto text-slate-400">
              {new Date(symptom.created_at || symptom.createdAt).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} at {new Date(symptom.created_at || symptom.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Key Metrics */}
          <div className="lg:col-span-1 space-y-6">
            {/* Severity Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-red-600">{symptom.severity}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Severity</h3>
                <p className="text-lg font-semibold text-white">out of 10</p>
              </div>
            </div>

            {/* Stress Level Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-orange-600">{symptom.stress_level}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Stress Level</h3>
                <p className="text-lg font-semibold text-white">out of 10</p>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  symptom.isOngoing ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <svg className={`w-8 h-8 ${symptom.isOngoing ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {symptom.isOngoing ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Status</h3>
                <p className="text-lg font-semibold text-white">{symptom.isOngoing ? 'Ongoing' : 'Resolved'}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Detailed Information */}
          <div className="lg:col-span-2 space-y-6">

            {/* Timeline Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold font-source text-white">Timeline</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-300 font-medium">Started</span>
                  </div>
                  <span className="font-semibold text-white">
                    {symptom.symptom_start_date ? new Date(symptom.symptom_start_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                {!symptom.is_ongoing && symptom.symptom_end_date && (
                  <div className="flex items-center justify-between pt-3 pb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-slate-300 font-medium">Ended</span>
                    </div>
                    <span className="font-semibold text-white">{new Date(symptom.symptom_end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bathroom Frequency Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold font-source text-white">Bathroom Frequency</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-slate-300 font-medium">Normal frequency</span>
                  <span className="font-semibold text-white">{symptom.normal_bathroom_frequency || 'Not set'} times/day</span>
                </div>
                {symptom.bathroom_frequency_changed && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-slate-300 font-medium">Frequency changed</span>
                    <span className="font-semibold text-white">{symptom.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {symptom.bathroom_frequency_changed === 'yes' && symptom.bathroom_frequency_change_details && (
                  <div className="py-3">
                    <span className="text-slate-300 font-medium block mb-2">Description</span>
                    <p className="text-white leading-relaxed">{symptom.bathroom_frequency_change_details}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold font-source text-white">Lifestyle</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-slate-300 font-medium">Smoking</span>
                  <span className="font-semibold text-white">{symptom.smoking ? 'Yes' : 'No'}</span>
                </div>
                {symptom.smoking && symptom.smoking_details && (
                  <div className="py-3 border-b border-gray-100">
                    <span className="text-slate-300 font-medium block mb-2">Smoking details</span>
                    <p className="text-white leading-relaxed">{symptom.smoking_details}</p>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-slate-300 font-medium">Alcohol</span>
                  <span className="font-semibold text-white">{symptom.alcohol ? 'Yes' : 'No'}</span>
                </div>
                {symptom.alcohol && symptom.alcohol_units && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-300 font-medium">Alcohol units</span>
                    <span className="font-semibold text-white">{symptom.alcohol_units} units/day</span>
                  </div>
                )}
              </div>
            </div>

            {/* Meals Card */}
            {(symptom.breakfast?.some(item => item.food?.trim()) ||
              symptom.lunch?.some(item => item.food?.trim()) ||
              symptom.dinner?.some(item => item.food?.trim())) && (
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Pizza className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-semibold font-source text-white">Meals</h3>
                </div>
                <div className="space-y-6">
                  {symptom.breakfast?.some(item => item.food?.trim()) && (
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Breakfast
                      </h4>
                      <div className="space-y-2">
                        {symptom.breakfast.filter(item => item.food?.trim()).map((item, index) => (
                          <div key={index} className="text-slate-800 bg-yellow-100 rounded-lg px-3 py-2">
                            <span className="font-medium">{item.food}</span>
                            <span className="text-slate-600 ml-2">({item.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {symptom.lunch?.some(item => item.food?.trim()) && (
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Lunch
                      </h4>
                      <div className="space-y-2">
                        {symptom.lunch.filter(item => item.food?.trim()).map((item, index) => (
                          <div key={index} className="text-slate-800 bg-yellow-100 rounded-lg px-3 py-2">
                            <span className="font-medium">{item.food}</span>
                            <span className="text-slate-600 ml-2">({item.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {symptom.dinner?.some(item => item.food?.trim()) && (
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Dinner
                      </h4>
                      <div className="space-y-2">
                        {symptom.dinner.filter(item => item.food?.trim()).map((item, index) => (
                          <div key={index} className="text-slate-800 bg-yellow-100 rounded-lg px-3 py-2">
                            <span className="font-medium">{item.food}</span>
                            <span className="text-slate-600 ml-2">({item.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Card */}
            {symptom.notes && (
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold font-source text-white">Notes</h3>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-4">
                  <p className="text-slate-200 leading-relaxed">{symptom.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom delete action (all screens) */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-700/50">
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="w-full px-5 py-3.5 text-slate-300 border border-slate-600/30 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 focus:outline-none transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete entry'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md mx-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Symptom Entry</h3>
            </div>
            
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this symptom entry? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-400 rounded-lg transition-colors disabled:opacity-50"
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

export default function SymptomDetail() {
  return (
    <ProtectedRoute>
      <SymptomDetailContent />
    </ProtectedRoute>
  )
}
