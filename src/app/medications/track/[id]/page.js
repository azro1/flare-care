'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'

function TrackedMedicationDetails() {
  const router = useRouter()
  const [trackedData, setTrackedData] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('flarecare-medication-tracking')
      if (data) {
        const parsed = JSON.parse(data)
        const medicationId = window.location.pathname.split('/').pop()
        const found = parsed.find(item => item.id === medicationId)
        if (found) {
          setTrackedData(found)
        } else {
          router.push('/medications')
        }
      } else {
        router.push('/medications')
      }
    }
  }, [router])

  if (!trackedData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
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

      <h1 className="text-2xl sm:text-3xl font-bold font-source text-primary mb-6">
        Medication Tracking Details
      </h1>

      <div className="mb-6">
        <p className="text-secondary">
          {new Date(trackedData.createdAt).toLocaleDateString('en-GB', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
        <p className="text-sm text-slate-400">
          {new Date(trackedData.createdAt).toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Missed Medications */}
        {trackedData.missedMedicationsList && trackedData.missedMedicationsList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary mb-4">Missed Medications</h2>
            <div className="space-y-6">
              {trackedData.missedMedicationsList.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2">
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
        {trackedData.nsaidList && trackedData.nsaidList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary mb-4">NSAIDs</h2>
            <div className="space-y-6">
              {trackedData.nsaidList.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2">
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
        {trackedData.antibioticList && trackedData.antibioticList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary mb-4">Antibiotics</h2>
            <div className="space-y-6">
              {trackedData.antibioticList.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2">
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

