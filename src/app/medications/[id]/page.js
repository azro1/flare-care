'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import { useAuth } from '@/lib/AuthContext'
import { supabase, TABLES } from '@/lib/supabase'

function getTimeLabel(timeOfDay) {
  if (!timeOfDay) return 'Not set'
  if (timeOfDay.match(/^\d{2}:\d{2}$/)) {
    const [hours, minutes] = timeOfDay.split(':')
    const time = new Date(`2000-01-01T${hours}:${minutes}`)
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  return timeOfDay
}

function formatUKDate(dateString) {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Not set'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function MedicationDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [medication, setMedication] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const fetchMedication = async () => {
      if (!user?.id || !params?.id) return

      try {
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('id', parseInt(params.id, 10))
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/medications')
          return
        }

        setMedication({
          id: String(data.id),
          name: data.name || '',
          dosage: data.dosage || '',
          frequency: data.frequency || '',
          timeOfDay: data.time_of_day || '',
          remindersEnabled: data.reminders_enabled !== false,
          notes: data.notes || '',
          createdAt: data.created_at
        })
      } catch (error) {
        console.error('Error fetching medication details:', error)
        router.push('/medications')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMedication()
  }, [params?.id, router, user?.id])

  const handleDelete = async () => {
    if (!medication?.id || !user?.id) return
    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from(TABLES.MEDICATIONS)
        .delete()
        .eq('id', parseInt(medication.id, 10))
        .eq('user_id', user.id)

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const deletedKey = `flarecare-medication-deleted-${user.id}-${today}`
      localStorage.setItem(deletedKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        medicationName: medication.name
      }))

      try {
        await supabase
          .from(TABLES.MEDICATION_TAKEN)
          .delete()
          .eq('user_id', user.id)
          .eq('medication_id', medication.id)
      } catch (err) {
        console.error('Error removing medication taken rows:', err)
      }

      window.dispatchEvent(new Event('medication-deleted'))
      router.push('/medications')
    } catch (error) {
      console.error('Error deleting medication:', error)
      alert('Failed to delete medication. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0 min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5F9EA0] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!medication) return null

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6 card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-2">
              Medication Details
            </h1>
            <p className="text-sm text-secondary font-sans truncate">{medication.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="p-2.5 rounded-lg text-red-600 dark:[color:var(--text-trash)] sm:hover:bg-red-500/10 sm:dark:hover:bg-[var(--bg-card-inner)] focus:outline-none disabled:opacity-50 transition-colors flex-shrink-0"
            title="Delete medication"
            aria-label="Delete medication"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6">
        <h2 className="text-xl font-semibold font-title text-primary mb-4">Details</h2>
        <div className="space-y-0 [&>*:last-child]:pb-0">
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Medication</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right break-words">{medication.name}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Dosage</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{medication.dosage || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Frequency</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right break-words">{medication.frequency || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Reminder time</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{getTimeLabel(medication.timeOfDay)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Reminders</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">
              {medication.remindersEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 min-w-0">
            <span className="text-sm sm:text-base text-secondary font-sans">Added</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKDate(medication.createdAt)}</span>
          </div>
        </div>
      </div>

      {medication.notes && (
        <div className="card mb-5 sm:mb-6">
          <h2 className="text-xl font-semibold font-title text-primary mb-4">Notes</h2>
          <p className="text-sm sm:text-base text-secondary font-sans leading-relaxed break-words">
            {medication.notes}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/medications')}
          className="button-cadet flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center whitespace-nowrap"
        >
          Back to medications
        </button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Medication"
        message="Are you sure you want to delete this medication? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  )
}

export default function MedicationDetailsPage() {
  return (
    <ProtectedRoute>
      <MedicationDetailsContent />
    </ProtectedRoute>
  )
}

