'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import { useAuth } from '@/lib/AuthContext'
import { supabase, TABLES } from '@/lib/supabase'
import { formatBristolDetailLabel, formatBristolTypeOnly } from '@/lib/bristolStoolChart'

function formatUKDateFromOccurred(iso) {
  if (!iso) return 'Not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not set'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatUKTimeFromOccurred(iso) {
  if (!iso) return 'Not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not set'
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function formatHeaderDateTime(iso) {
  if (!iso) return 'Not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not set'
  const datePart = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${datePart} at ${timePart}`
}

function formatTriState(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'Prefer not to say'
}

function BowelMovementDetailsContent() {
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
          .from(TABLES.BOWEL_MOVEMENTS)
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/bowel-movements')
          return
        }
        setEntry(data)
      } catch (error) {
        console.error('Error fetching bowel movement entry:', error)
        router.push('/bowel-movements')
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
        .from(TABLES.BOWEL_MOVEMENTS)
        .delete()
        .eq('id', entry.id)
        .eq('user_id', user.id)
      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const bowelDeletedKey = `flarecare-bowel-movement-deleted-${user.id}-${today}`
      localStorage.setItem(bowelDeletedKey, JSON.stringify({ timestamp: new Date().toISOString() }))
      window.dispatchEvent(new Event('bowel-movement-deleted'))
      router.push('/bowel-movements')
    } catch (error) {
      console.error('Error deleting bowel movement:', error)
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-2">Bowel Log Details</h1>
            <p className="text-sm text-tertiary font-sans mt-1 sm:mt-2">{formatHeaderDateTime(entry.created_at)}</p>
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
        <div className="space-y-0 [&>*:last-child]:pb-0 [&>*:last-child]:border-b-0">
          <div className="flex justify-between items-center gap-4 pt-0 pb-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKDateFromOccurred(entry.occurred_at)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Time</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatUKTimeFromOccurred(entry.occurred_at)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Bristol type</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right" title={formatBristolDetailLabel(entry.bristol_type)}>
              {formatBristolTypeOnly(entry.bristol_type)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Blood visible?</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatTriState(entry.blood)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Pain or straining?</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatTriState(entry.strain)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-4 border-b min-w-0" style={{ borderColor: 'var(--separator-card)' }}>
            <span className="text-sm sm:text-base text-secondary font-sans">Urgent need to go?</span>
            <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{formatTriState(entry.urgency)}</span>
          </div>
        </div>
      </div>

      {entry.notes?.trim() && (
        <div className="card mb-5 sm:mb-6">
          <h2 className="text-xl font-semibold font-title text-primary mb-3 sm:mb-4">Notes</h2>
          <p className="text-sm sm:text-base text-secondary font-sans leading-normal break-words">{entry.notes.trim()}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/bowel-movements')}
          className="button-cadet btn-size-md flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors hover:shadow-lg inline-flex items-center justify-center whitespace-nowrap font-sans w-auto"
        >
          Back
        </button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete bowel log"
        message="Are you sure you want to delete this log? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  )
}

export default function BowelMovementDetailsPage() {
  return (
    <ProtectedRoute>
      <BowelMovementDetailsContent />
    </ProtectedRoute>
  )
}

