'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import { useAuth } from '@/lib/AuthContext'
import { supabase, TABLES } from '@/lib/supabase'

function formatUKDate(dateString) {
  if (!dateString) return 'Not set'
  const date = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T12:00:00`)
  if (isNaN(date.getTime())) return 'Not set'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function WeightDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [entry, setEntry] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const fetchEntry = async () => {
      if (!user?.id || !params?.id) return
      try {
        const { data, error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .select('*')
          .eq('id', parseInt(params.id, 10))
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/weight')
          return
        }
        setEntry(data)
      } catch (error) {
        console.error('Error fetching weight entry:', error)
        router.push('/weight')
      } finally {
        setIsLoading(false)
      }
    }
    fetchEntry()
  }, [params?.id, router, user?.id])

  const handleDelete = async () => {
    if (!entry?.id || !user?.id) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from(TABLES.TRACK_WEIGHT)
        .delete()
        .eq('id', entry.id)
        .eq('user_id', user.id)
      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const weightDeletedKey = `flarecare-weight-deleted-${user.id}-${today}`
      localStorage.setItem(weightDeletedKey, JSON.stringify({ timestamp: new Date().toISOString() }))
      window.dispatchEvent(new Event('weight-deleted'))
      router.push('/weight')
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete. Please try again.')
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
  if (!entry) return null

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6 card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-2">Weight Details</h1>
            <p className="text-sm text-secondary font-sans">{formatUKDate(entry.date)}</p>
          </div>
          <button
            type="button"
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
      </div>

      <div className="card mb-5 sm:mb-6">
        <h2 className="text-xl font-semibold font-title text-primary mb-4">Details</h2>
        <div className="space-y-0 [&>*:last-child]:pb-0">
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKDate(entry.date)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Weight</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{entry.value_kg} kg</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 min-w-0">
            <span className="text-sm sm:text-base text-secondary font-sans">Added</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKDate(entry.created_at)}</span>
          </div>
        </div>
      </div>

      {entry.notes?.trim() && (
        <div className="card mb-5 sm:mb-6">
          <h2 className="text-xl font-semibold font-title text-primary mb-4">Notes</h2>
          <p className="text-sm sm:text-base text-secondary font-sans leading-relaxed break-words">{entry.notes}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/weight')}
          className="button-cadet flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center whitespace-nowrap"
        >
          Back to weight
        </button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Weight Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  )
}

export default function WeightDetailsPage() {
  return (
    <ProtectedRoute>
      <WeightDetailsContent />
    </ProtectedRoute>
  )
}

