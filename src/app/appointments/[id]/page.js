'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import { useAuth } from '@/lib/AuthContext'
import { supabase, TABLES } from '@/lib/supabase'

function getReminderLabel(minutes) {
  if (!minutes) return 'No reminder'
  const labels = {
    5: '5 minutes before',
    10: '10 minutes before',
    15: '15 minutes before',
    30: '30 minutes before',
    45: '45 minutes before',
    60: '1 hour before',
    120: '2 hours before',
    1440: '24 hours before'
  }
  return labels[minutes] || `${minutes} mins before`
}

function AppointmentDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [appointment, setAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!user?.id || !params?.id) return

      try {
        const { data, error } = await supabase
          .from(TABLES.APPOINTMENTS)
          .select('*')
          .eq('id', parseInt(params.id, 10))
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/appointments')
          return
        }

        setAppointment({
          id: data.id,
          date: data.date || '',
          time: data.time || '',
          type: data.type || '',
          clinicianName: data.clinician_name || '',
          location: data.location || '',
          notes: data.notes || '',
          reminderMinutesBefore: data.reminder_minutes_before ?? null,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        })
      } catch (error) {
        console.error('Error fetching appointment:', error)
        router.push('/appointments')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointment()
  }, [user?.id, params?.id, router])

  const formatUKDate = (dateString) => {
    if (!dateString) return 'Not set'
    const d = new Date(`${dateString}T12:00:00`)
    if (isNaN(d.getTime())) return 'Not set'
    return d.toLocaleDateString('en-GB')
  }

  const handleDelete = async () => {
    if (!appointment?.id || !user?.id) return
    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from(TABLES.APPOINTMENTS)
        .delete()
        .eq('id', appointment.id)
        .eq('user_id', user.id)

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const activityKey = `flarecare-appointment-deleted-${user.id}-${today}`
      localStorage.setItem(activityKey, JSON.stringify({ timestamp: new Date().toISOString() }))
      window.dispatchEvent(new Event('appointment-deleted'))
      router.push('/appointments')
    } catch (error) {
      console.error('Error deleting appointment:', error)
      alert('Failed to delete appointment. Please try again.')
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

  if (!appointment) return null

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6 card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-2">
              Appointment Details
            </h1>
            <p className="text-sm text-secondary font-sans">
              {appointment.type || 'Appointment'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="p-2.5 rounded-lg text-red-600 dark:[color:var(--text-trash)] sm:hover:bg-red-500/10 sm:dark:hover:bg-[var(--bg-card-inner)] focus:outline-none disabled:opacity-50 transition-colors flex-shrink-0"
            title="Delete appointment"
            aria-label="Delete appointment"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6">
        <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Details</h2>
        <div className="space-y-0 [&>*:last-child]:pb-0">
          <div className="flex justify-between items-center gap-4 pt-0 pb-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKDate(appointment.date)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Time</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{appointment.time || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Type</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right break-words">{appointment.type || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Clinician</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right break-words">{appointment.clinicianName || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Location</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right break-words">{appointment.location || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 min-w-0">
            <span className="text-sm sm:text-base text-secondary font-sans">Reminder</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">
              {getReminderLabel(appointment.reminderMinutesBefore)}
            </span>
          </div>
        </div>
      </div>

      {appointment.notes && (
        <div className="card mb-5 sm:mb-6">
          <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Notes</h2>
          <p className="text-sm sm:text-base text-secondary font-sans leading-normal break-words">
            {appointment.notes}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/appointments')}
          className="button-cadet flex-shrink-0 py-3 px-6 rounded-xl hover:shadow-lg inline-flex items-center justify-center whitespace-nowrap font-sans w-auto"
        >
          Back to My Appointments
        </button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete appointment?"
        message="This appointment will be removed. Are you sure you want to delete it?"
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  )
}

export default function AppointmentDetailsPage() {
  return (
    <ProtectedRoute>
      <AppointmentDetailsContent />
    </ProtectedRoute>
  )
}

