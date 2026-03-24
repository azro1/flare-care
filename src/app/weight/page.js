'use client'

import { useState, useEffect, useRef } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import DateInputWithCalendar from '@/components/DateInputWithCalendar'
import { sanitizeNotes } from '@/lib/sanitize'
import { Scale, ChevronDown } from 'lucide-react'
import Masonry from 'react-masonry-css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

function WeightPageContent() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [expandedWeightEntries, setExpandedWeightEntries] = useState(new Set())
  const [weightPanelOpen, setWeightPanelOpen] = useState(false)
  const weightDatePickerRef = useRef(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    valueKg: '',
    notes: ''
  })

  const fetchEntries = async () => {
    if (!user?.id) {
      setEntries([])
      setIsLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.TRACK_WEIGHT)
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map(row => ({
        id: row.id,
        date: row.date,
        valueKg: row.value_kg,
        notes: row.notes || '',
        createdAt: row.created_at
      }))
      setEntries(transformed)
    } catch (error) {
      console.error('Error fetching weight entries:', error)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [user?.id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (isAdding) window.scrollTo(0, 0)
  }, [isAdding])

  useEffect(() => {
    if (isAdding) setWeightPanelOpen(true)
  }, [isAdding])

  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00')
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const weight = parseFloat(formData.valueKg)
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid weight (e.g. 70.5).')
      return
    }
    if (!formData.date) {
      alert('Please select a date.')
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .update({
            date: formData.date,
            value_kg: weight,
            notes: sanitizeNotes(formData.notes)
          })
          .eq('id', parseInt(editingId))
          .eq('user_id', user.id)

        if (error) throw error

        setEntries(prev => prev.map(entry =>
          entry.id === editingId
            ? { ...entry, date: formData.date, valueKg: weight, notes: sanitizeNotes(formData.notes) }
            : entry
        ))
        setEditingId(null)
        const today = new Date().toISOString().split('T')[0]
        const weightUpdatedKey = `flarecare-weight-updated-${user.id}-${today}`
        localStorage.setItem(weightUpdatedKey, JSON.stringify({
          timestamp: new Date().toISOString()
        }))
        window.dispatchEvent(new Event('weight-updated'))
      } else {
        const { data, error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .insert([{
            user_id: user.id,
            date: formData.date,
            value_kg: weight,
            notes: sanitizeNotes(formData.notes)
          }])
          .select()

        if (error) throw error

        const inserted = data[0]
        setEntries(prev => [{
          id: inserted.id,
          date: inserted.date,
          valueKg: inserted.value_kg,
          notes: inserted.notes || '',
          createdAt: inserted.created_at
        }, ...prev])
        const today = new Date().toISOString().split('T')[0]
        localStorage.removeItem(`flarecare-weight-deleted-${user.id}-${today}`)
        localStorage.removeItem(`flarecare-weight-updated-${user.id}-${today}`)
        window.dispatchEvent(new Event('weight-added'))
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        valueKg: '',
        notes: ''
      })
      setIsAdding(false)
    } catch (error) {
      console.error('Error saving weight entry:', error)
      alert('Failed to save. Please try again.')
    }
  }

  const startEdit = (entry) => {
    setFormData({
      date: entry.date,
      valueKg: String(entry.valueKg),
      notes: entry.notes || ''
    })
    setEditingId(entry.id)
    setIsAdding(true)
  }

  const startAdding = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      valueKg: '',
      notes: ''
    })
    setEditingId(null)
    setIsAdding(true)
  }

  const cancelEdit = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      valueKg: '',
      notes: ''
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const confirmDelete = async () => {
    if (!deleteModal.id || !user?.id) return
    try {
      const { error } = await supabase
        .from(TABLES.TRACK_WEIGHT)
        .delete()
        .eq('id', parseInt(deleteModal.id))
        .eq('user_id', user.id)

      if (error) throw error
      setEntries(prev => prev.filter(e => e.id !== deleteModal.id))
      setDeleteModal({ isOpen: false, id: null })

      const today = new Date().toISOString().split('T')[0]
      const weightDeletedKey = `flarecare-weight-deleted-${user.id}-${today}`
      localStorage.setItem(weightDeletedKey, JSON.stringify({
        timestamp: new Date().toISOString()
      }))
      window.dispatchEvent(new Event('weight-deleted'))
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const closeDeleteModal = () => setDeleteModal({ isOpen: false, id: null })

  const toggleWeightExpand = (id) => {
    setExpandedWeightEntries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">
                My Weight
              </h1>
              <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
                Record your weight over time to monitor trends and share with your healthcare team
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6 min-w-0">
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="weight-panel-trigger"
            aria-expanded={weightPanelOpen}
            aria-controls="weight-list-panel"
            aria-label={weightPanelOpen ? 'Collapse weight logs' : 'Expand weight logs'}
            onClick={() => setWeightPanelOpen((o) => !o)}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-2 -m-2 shadow-none cursor-pointer [-webkit-tap-highlight-color:transparent] text-secondary hover:opacity-70 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5F9EA0]/45 focus-visible:ring-offset-0 touch-manipulation"
          >
            <ChevronDown
              className={`h-5 w-5 shrink-0 transition-transform duration-200 ${weightPanelOpen ? 'rotate-180' : ''}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
          <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dashboard-icon-panel">
            {isAdding ? (
              <svg className="w-5 h-5 text-indigo-600 dark:[color:var(--text-icon-more-weight)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ) : (
              <Scale className="w-5 h-5 text-indigo-600 dark:[color:var(--text-icon-more-weight)]" />
            )}
          </div>
          <h2 id="weight-panel-heading" className="min-w-0 flex-1 text-xl font-semibold font-source text-primary">
            Weight logs
          </h2>
          {weightPanelOpen && !isAdding && (
            <button
              type="button"
              onClick={startAdding}
              className="button-cadet flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {weightPanelOpen && (
            <motion.div
              key="weight-panel"
              id="weight-list-panel"
              role="region"
              aria-labelledby="weight-panel-heading"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden min-w-0"
            >
              <div className="min-w-0 space-y-4 pt-5 sm:pt-3 sm:space-y-5">
        <AnimatePresence>
        {isAdding && (
          <motion.div
            key="add-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="min-w-0 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="grid sm:grid-cols-2 gap-6 min-w-0">
                <div className="w-full">
                  <label htmlFor="weight-date" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                    Date *
                  </label>
                  <div className="w-full sm:max-w-[150px]">
                  <DatePicker
                    ref={weightDatePickerRef}
                    id="weight-date"
                    selected={formData.date ? new Date(formData.date + 'T12:00:00') : null}
                    onChange={(date) => setFormData(prev => ({
                      ...prev,
                      date: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    placeholderText="Select date"
                    customInput={<DateInputWithCalendar onIconClick={() => weightDatePickerRef.current?.setOpen?.(true)} />}
                    dateFormat="dd/MM/yyyy"
                    maxDate={new Date()}
                    preventOpenOnFocus
                    wrapperClassName="w-full"
                    enableTabLoop={false}
                  />
                  </div>
                </div>
                <div>
                  <label htmlFor="valueKg" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                    Weight (kg) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="valueKg"
                    name="valueKg"
                    value={formData.valueKg}
                    maxLength={7}
                    onChange={(e) => {
                      let v = e.target.value
                      v = v.replace(/[^\d.]/g, '')
                      const parts = v.split('.')
                      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
                      setFormData(prev => ({ ...prev, valueKg: v }))
                    }}
                    placeholder="e.g. 70.5"
                    className="input-field-wizard w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. morning, after breakfast"
                  className="w-full px-4 py-3 input-field-wizard resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="submit" className="button-cadet px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors">
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-base sm:text-lg font-medium font-sans rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-button-cancel)', color: 'var(--text-primary)' }}
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
        </AnimatePresence>

        {isLoading ? (
          <p className="text-center py-12 text-secondary font-roboto">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
              <Scale className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-source text-primary mb-2">No weight logs</h3>
            <p className="text-sm font-roboto text-secondary max-w-md mx-auto leading-relaxed">
              Your weight logs will show here once you add them
            </p>
          </div>
        ) : (
          <Masonry
            breakpointCols={{
              default: 2,
              1024: 2,
              640: 1
            }}
            className="flex -ml-4 w-auto min-w-0"
            columnClassName="pl-4 bg-clip-padding"
          >
            {entries.map((entry) => {
              const isExpanded = expandedWeightEntries.has(entry.id)
              return (
                <div key={entry.id} className="mb-4 last:mb-0">
                  <div className="card-inner p-4 sm:p-6 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1">
                          <span className="font-semibold text-primary">{formatUKDate(entry.date)}</span>
                          <span className="text-secondary">·</span>
                          <span className="text-primary font-roboto">{Number(entry.valueKg)} kg</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleWeightExpand(entry.id)}
                          className="flex-shrink-0 p-1 rounded transition-colors hover:opacity-80 sm:self-start"
                          style={{ color: 'var(--text-icon)' }}
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <ChevronDown
                            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      <motion.div
                        initial={false}
                        animate={{
                          height: isExpanded ? 'auto' : 0,
                          opacity: isExpanded ? 1 : 0
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => startEdit(entry)}
                              disabled={editingId === entry.id}
                              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-[var(--bg-icon-container)]"
                              style={{ color: 'var(--text-icon)' }}
                              title={editingId === entry.id ? 'Finish or cancel editing first' : 'Edit entry'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModal({ isOpen: true, id: entry.id })}
                              disabled={editingId === entry.id}
                              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-[var(--bg-icon-container)]"
                              style={{ color: 'var(--text-icon)' }}
                              title={editingId === entry.id ? 'Finish or cancel editing first' : 'Delete entry'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                      </motion.div>
                    </div>
                  </div>
                  {isExpanded && entry.notes?.trim() && (
                    <div className="mt-2 min-w-0">
                      <div className="card-inner min-w-0">
                        <p className="text-sm text-secondary font-roboto break-words line-clamp-2" title={entry.notes}>
                          <span className="font-semibold text-primary">Notes:</span> {entry.notes}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className={`${isExpanded ? 'mt-2' : 'mt-1'} text-xs text-tertiary font-roboto`}>
                    <div className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Added {formatUKDate(entry.createdAt)}
                    </div>
                  </div>
                  </div>
                </div>
              )
            })}
          </Masonry>
        )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Weight Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  )
}

export default function WeightPage() {
  return (
    <ProtectedRoute>
      <WeightPageContent />
    </ProtectedRoute>
  )
}
