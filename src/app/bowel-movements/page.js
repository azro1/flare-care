'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import DateInputWithCalendar from '@/components/DateInputWithCalendar'
import BristolTypeDiagram from '@/components/BristolTypeDiagram'
import { supabase, TABLES } from '@/lib/supabase'
import {
  BRISTOL_TYPES,
  formatBristolDetailLabel,
  formatBristolTypeOnly,
} from '@/lib/bristolStoolChart'
import { Lightbulb, ChevronDown, CircleDot } from 'lucide-react'
import Masonry from 'react-masonry-css'
import { motion, AnimatePresence } from 'framer-motion'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push({ value: timeString, label: timeString })
    }
  }
  return options
}

function defaultDateTimeParts() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  let totalMins = d.getHours() * 60 + d.getMinutes()
  totalMins = Math.round(totalMins / 15) * 15
  if (totalMins >= 24 * 60) totalMins = 23 * 60 + 45
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const time = `${pad(h)}:${pad(m)}`
  return { date, time }
}

function parseTriState(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/** Local calendar date as DD/MM/YYYY — same as weight page `formatUKDate` for a stored instant */
function formatUKDateFromOccurred(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatUKTimeFromOccurred(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Local YYYY-MM-DD + time snapped to 15 min (matches form selects) from a stored instant */
function occurredAtToFormParts(iso) {
  if (!iso) return defaultDateTimeParts()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return defaultDateTimeParts()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  let totalMins = d.getHours() * 60 + d.getMinutes()
  totalMins = Math.round(totalMins / 15) * 15
  if (totalMins >= 24 * 60) totalMins = 23 * 60 + 45
  const h = Math.floor(totalMins / 60)
  const mi = totalMins % 60
  const time = `${pad(h)}:${pad(mi)}`
  return { date, time }
}

function boolToTri(value) {
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
}

/** Newest saved log first — matches “last entry I added” (not movement time). */
function sortBowelByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => {
    const byCreated =
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    if (byCreated !== 0) return byCreated
    return (
      new Date(b.occurred_at || 0).getTime() - new Date(a.occurred_at || 0).getTime()
    )
  })
}

function emptyFormState() {
  const { date, time } = defaultDateTimeParts()
  return {
    date,
    time,
    bristolType: null,
    blood: '',
    strain: '',
    urgency: '',
    notes: '',
  }
}

function BowelMovementsPageContent() {
  const { user } = useAuth()
  const timeOptions = generateTimeOptions()
  const bowelDatePickerRef = useRef(null)
  const [formState, setFormState] = useState(() => emptyFormState())
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [bowelPanelOpen, setBowelPanelOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [editingId, setEditingId] = useState(null)
  const [expandedBowelEntries, setExpandedBowelEntries] = useState(() => new Set())
  /** After fetch: open panel if no logs; closed if any exist. Ref tracks 0↔non-zero transitions only. */
  const bowelEntriesCountPrevRef = useRef(null)

  const fetchEntries = async () => {
    if (!user?.id) {
      setEntries([])
      setIsLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.BOWEL_MOVEMENTS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(sortBowelByCreatedAtDesc(data || []))
    } catch (err) {
      console.error('Error fetching bowel movements:', err)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [user?.id])

  useEffect(() => {
    bowelEntriesCountPrevRef.current = null
  }, [user?.id])

  useEffect(() => {
    if (isLoading) return
    const n = entries.length
    const prev = bowelEntriesCountPrevRef.current
    if (prev === null) {
      setBowelPanelOpen(n === 0)
    } else if (prev > 0 && n === 0) {
      setBowelPanelOpen(true)
    } else if (prev === 0 && n > 0) {
      setBowelPanelOpen(false)
    }
    bowelEntriesCountPrevRef.current = n
  }, [isLoading, entries.length])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (isAdding) window.scrollTo(0, 0)
  }, [isAdding])

  useEffect(() => {
    if (isAdding) setBowelPanelOpen(true)
  }, [isAdding])

  const startAdding = () => {
    setFormState(emptyFormState())
    setSaveError('')
    setEditingId(null)
    setIsAdding(true)
  }

  const startEdit = (row) => {
    const { date, time } = occurredAtToFormParts(row.occurred_at)
    setFormState({
      date,
      time,
      bristolType: row.bristol_type,
      blood: boolToTri(row.blood),
      strain: boolToTri(row.strain),
      urgency: boolToTri(row.urgency),
      notes: row.notes || '',
    })
    setSaveError('')
    setEditingId(row.id)
    setIsAdding(true)
    setExpandedBowelEntries((prev) => new Set(prev).add(row.id))
  }

  const cancelForm = () => {
    setFormState(emptyFormState())
    setSaveError('')
    setEditingId(null)
    setIsAdding(false)
  }

  const toggleBowelExpand = (id) => {
    setExpandedBowelEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError('')
    if (!user?.id) return
    if (formState.bristolType == null) {
      setSaveError('Please select a Bristol chart type.')
      return
    }
    if (!formState.date) {
      setSaveError('Please select a date.')
      return
    }
    if (!formState.time) {
      setSaveError('Please select a time.')
      return
    }
    const occurred = new Date(`${formState.date}T${formState.time}:00`)
    if (Number.isNaN(occurred.getTime())) {
      setSaveError('Please enter a valid date and time.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        occurred_at: occurred.toISOString(),
        bristol_type: formState.bristolType,
        blood: parseTriState(formState.blood),
        strain: parseTriState(formState.strain),
        urgency: parseTriState(formState.urgency),
        notes: formState.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error

        setEntries((prev) =>
          sortBowelByCreatedAtDesc(
            prev.map((entry) =>
              entry.id === editingId ? { ...entry, ...payload } : entry
            )
          )
        )
      } else {
        const { data, error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .insert([{ ...payload, user_id: user.id }])
          .select()

        if (error) throw error

        const inserted = data?.[0]
        if (!inserted) {
          await fetchEntries()
        } else {
          setEntries((prev) =>
            sortBowelByCreatedAtDesc([inserted, ...prev.filter((e) => e.id !== inserted.id)])
          )
        }
        const today = new Date().toISOString().split('T')[0]
        localStorage.removeItem(`flarecare-bowel-movement-deleted-${user.id}-${today}`)
      }
      setFormState(emptyFormState())
      setEditingId(null)
      setIsAdding(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bowel-movement-saved'))
      }
    } catch (err) {
      console.error('Error saving bowel movement:', err)
      setSaveError(err.message || 'Could not save this log.')
    } finally {
      setIsSaving(false)
    }
  }

  const closeDeleteModal = () => setDeleteModal({ isOpen: false, id: null })

  const confirmDelete = async () => {
    if (!deleteModal.id || !user?.id) return
    try {
      const { error } = await supabase
        .from(TABLES.BOWEL_MOVEMENTS)
        .delete()
        .eq('id', deleteModal.id)
        .eq('user_id', user.id)

      if (error) throw error
      setEntries((prev) => prev.filter((e) => e.id !== deleteModal.id))
      setExpandedBowelEntries((prev) => {
        const next = new Set(prev)
        next.delete(deleteModal.id)
        return next
      })
      setDeleteModal({ isOpen: false, id: null })

      const today = new Date().toISOString().split('T')[0]
      const bowelDeletedKey = `flarecare-bowel-movement-deleted-${user.id}-${today}`
      localStorage.setItem(bowelDeletedKey, JSON.stringify({ timestamp: new Date().toISOString() }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bowel-movement-deleted'))
      }
    } catch (err) {
      console.error('Error deleting bowel movement:', err)
    }
  }

  const triSelect = (field) => (
    <select
      id={`bowel-${field}`}
      value={formState[field]}
      onChange={(e) => setFormState((prev) => ({ ...prev, [field]: e.target.value }))}
      className={`input-field-wizard w-full ${formState[field] !== '' ? 'has-value' : 'placeholder'}`}
    >
      <option value="">Prefer not to say</option>
      <option value="false">No</option>
      <option value="true">Yes</option>
    </select>
  )

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">
                Bowel Movements
              </h1>
              <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
                Log your bowel movements and record stool type using the Bristol Stool Chart.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6 min-w-0">
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="bowel-panel-trigger"
            aria-expanded={bowelPanelOpen}
            aria-controls="bowel-list-panel"
            aria-label={bowelPanelOpen ? 'Collapse bowel logs' : 'Expand bowel logs'}
            onClick={() => setBowelPanelOpen((o) => !o)}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-2 -m-2 shadow-none cursor-pointer [-webkit-tap-highlight-color:transparent] text-secondary hover:opacity-70 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5F9EA0]/45 focus-visible:ring-offset-0 touch-manipulation"
          >
            <ChevronDown
              className={`h-5 w-5 shrink-0 transition-transform duration-200 ${bowelPanelOpen ? 'rotate-180' : ''}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
          <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 dashboard-icon-panel">
            {isAdding ? (
              <svg
                className="w-5 h-5 text-amber-800 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            ) : (
              <CircleDot className="w-5 h-5 text-amber-800 dark:text-amber-400" aria-hidden />
            )}
          </div>
          <h2 id="bowel-panel-heading" className="min-w-0 flex-1 text-xl font-semibold font-source text-primary">
            Bowel logs
          </h2>
          {bowelPanelOpen && !isAdding && (
            <button
              type="button"
              onClick={startAdding}
              className="button-cadet flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {bowelPanelOpen && (
            <motion.div
              key="bowel-panel"
              id="bowel-list-panel"
              role="region"
              aria-labelledby="bowel-panel-heading"
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
                      key={editingId ?? 'bowel-new'}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="min-w-0 overflow-hidden"
                    >
                      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" autoComplete="off">
                        <div className="grid sm:grid-cols-2 gap-6 min-w-0">
                          <div className="w-full">
                            <label
                              htmlFor="bowel-date"
                              className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                            >
                              Date *
                            </label>
                            <div className="w-full sm:max-w-[150px]">
                              <DatePicker
                                ref={bowelDatePickerRef}
                                id="bowel-date"
                                selected={formState.date ? new Date(`${formState.date}T12:00:00`) : null}
                                onChange={(date) =>
                                  setFormState((prev) => ({
                                    ...prev,
                                    date: date ? date.toISOString().split('T')[0] : '',
                                  }))
                                }
                                placeholderText="Select date"
                                customInput={
                                  <DateInputWithCalendar
                                    onIconClick={() => bowelDatePickerRef.current?.setOpen?.(true)}
                                  />
                                }
                                dateFormat="dd/MM/yyyy"
                                maxDate={new Date()}
                                preventOpenOnFocus
                                wrapperClassName="w-full"
                                enableTabLoop={false}
                              />
                            </div>
                          </div>
                          <div className="w-full">
                            <label
                              htmlFor="bowel-time"
                              className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                            >
                              Time *
                            </label>
                            <select
                              id="bowel-time"
                              value={formState.time}
                              onChange={(e) => setFormState((prev) => ({ ...prev, time: e.target.value }))}
                              className={`input-field-wizard w-full sm:max-w-[150px] ${formState.time ? 'has-value' : 'placeholder'}`}
                              required
                            >
                              <option value="">Select time</option>
                              {timeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-secondary font-roboto leading-relaxed mb-4 sm:mb-6">
                            Select the type that best matches this movement.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {BRISTOL_TYPES.map((t) => {
                              const selected = formState.bristolType === t.type
                              return (
                                <button
                                  key={t.type}
                                  type="button"
                                  onClick={() => setFormState((prev) => ({ ...prev, bristolType: t.type }))}
                                  className={`flex gap-3 items-start text-left rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors font-roboto text-sm ${
                                    selected
                                      ? 'border-[#5F9EA0] bg-[#5F9EA0]/10'
                                      : 'border-[var(--border-primary)] bg-[var(--bg-input)] hover:border-[var(--border-primary)]'
                                  }`}
                                >
                                  <span
                                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md ${
                                      selected
                                        ? 'bg-[#5F9EA0]/15 dark:bg-[#2a3d3e] dark:ring-1 dark:ring-inset dark:ring-[#5F9EA0]/45'
                                        : 'bg-amber-100/70 dark:bg-[var(--bg-card-inner)] dark:ring-1 dark:ring-inset dark:ring-[var(--border-primary)]'
                                    }`}
                                  >
                                    <BristolTypeDiagram
                                      type={t.type}
                                      className={`h-9 w-[3.25rem] sm:h-10 sm:w-14 ${
                                        selected
                                          ? 'text-[#3d6668] dark:text-[#8ecbcd]'
                                          : ''
                                      }`}
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1 pt-0.5 flex flex-col gap-0.5 text-left">
                                    <span className="text-sm leading-snug">
                                      <span className="font-semibold text-primary">Type {t.type}</span>
                                      <span className="text-secondary"> - {t.shortLabel}</span>
                                    </span>
                                    <span className="text-xs text-secondary leading-snug">{t.description}</span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div>
                            <label
                              htmlFor="bowel-blood"
                              className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                            >
                              Blood visible?
                            </label>
                            {triSelect('blood')}
                          </div>
                          <div>
                            <label
                              htmlFor="bowel-strain"
                              className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                            >
                              Pain or straining?
                            </label>
                            {triSelect('strain')}
                          </div>
                          <div>
                            <label
                              htmlFor="bowel-urgency"
                              className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                            >
                              Urgent need to go?
                            </label>
                            {triSelect('urgency')}
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="bowel-notes"
                            className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3"
                          >
                            Notes
                          </label>
                          <textarea
                            id="bowel-notes"
                            value={formState.notes}
                            onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full px-4 py-3 input-field-wizard resize-none"
                            placeholder="Anything else your clinician should know"
                          />
                        </div>

                        {saveError && (
                          <p className="text-sm font-roboto" role="alert" style={{ color: 'var(--text-cadet-blue)' }}>
                            {saveError}
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="button-cadet px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                          >
                            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelForm}
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
                      <CircleDot className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold font-source text-primary mb-2">No bowel logs</h3>
                    <p className="text-sm font-roboto text-secondary max-w-md mx-auto leading-relaxed">
                      Your bowel logs will show here once you add them
                    </p>
                  </div>
                ) : (
                  <Masonry
                    breakpointCols={{
                      default: 2,
                      1024: 2,
                      640: 1,
                    }}
                    className="flex -ml-4 w-auto min-w-0"
                    columnClassName="pl-4 bg-clip-padding"
                  >
                    {entries.map((row) => {
                      const isExpanded = expandedBowelEntries.has(row.id)
                      const dateLabel = formatUKDateFromOccurred(row.occurred_at)
                      const timeLabel = formatUKTimeFromOccurred(row.occurred_at)
                      const flags = []
                      if (row.blood === true) flags.push('Blood')
                      if (row.strain === true) flags.push('Strain')
                      if (row.urgency === true) flags.push('Urgency')
                      return (
                        <div key={row.id} className="mb-4 last:mb-0">
                          <div className="card-inner p-4 sm:p-6 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1 text-sm">
                                    <span className="font-semibold text-primary">{dateLabel}</span>
                                    {timeLabel ? (
                                      <>
                                        <span className="text-secondary">·</span>
                                        <span className="text-primary font-roboto">{timeLabel}</span>
                                      </>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleBowelExpand(row.id)}
                                    className="flex-shrink-0 p-1 rounded transition-colors hover:bg-opacity-20 sm:self-start"
                                    style={{ color: 'var(--text-icon)' }}
                                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                                  >
                                    <ChevronDown
                                      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                  </button>
                                </div>
                                <p
                                  className="text-xs sm:text-sm font-medium text-primary mt-1 min-w-0 truncate"
                                  title={formatBristolDetailLabel(row.bristol_type)}
                                >
                                  {formatBristolTypeOnly(row.bristol_type)}
                                </p>
                                <motion.div
                                  initial={false}
                                  animate={{
                                    height: isExpanded ? 'auto' : 0,
                                    opacity: isExpanded ? 1 : 0,
                                  }}
                                  transition={{ duration: 0.2, ease: 'easeOut' }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  {flags.length > 0 && (
                                    <p className="text-sm text-secondary font-roboto mt-2">{flags.join(' · ')}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(row)}
                                      disabled={editingId === row.id}
                                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-[var(--bg-icon-container)]"
                                      style={{ color: 'var(--text-icon)' }}
                                      title={editingId === row.id ? 'Finish or cancel editing first' : 'Edit entry'}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteModal({ isOpen: true, id: row.id })}
                                      disabled={editingId === row.id}
                                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-[var(--bg-icon-container)]"
                                      style={{ color: 'var(--text-icon)' }}
                                      title={editingId === row.id ? 'Finish or cancel editing first' : 'Delete entry'}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </motion.div>
                              </div>
                            </div>
                            {isExpanded && row.notes?.trim() && (
                              <div className="mt-2 min-w-0">
                                <div className="card-inner min-w-0">
                                  <p className="text-xs sm:text-sm text-secondary font-roboto break-words whitespace-pre-wrap">
                                    <span className="font-semibold text-primary">Notes:</span> {row.notes.trim()}
                                  </p>
                                </div>
                              </div>
                            )}
                            {isExpanded && (
                              <div className="mt-2 text-xs text-tertiary font-roboto">
                                <div className="flex items-center">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Added {row.created_at ? formatUKDateFromOccurred(row.created_at) : '—'}
                                </div>
                              </div>
                            )}
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

      <div className="mt-4 sm:mt-6 card">
        <div>
          <p className="text-sm text-secondary font-roboto leading-relaxed">
            Recording bowel movements and stool type helps build a clearer picture of your condition.
          </p>
          <div className="card-inner p-5 sm:p-6 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <span className="text-base sm:text-sm font-semibold text-primary font-source">Note:</span>
            </div>
            <p className="text-xs text-secondary font-roboto leading-relaxed">
              Types 1–2 are harder, 3–4 are often ideal, and 5–7 are looser or diarrhoea-like.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete bowel log"
        message="Are you sure you want to delete this log? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  )
}

export default function BowelMovementsPage() {
  return (
    <ProtectedRoute>
      <BowelMovementsPageContent />
    </ProtectedRoute>
  )
}
