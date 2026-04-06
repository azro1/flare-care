'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import DateInputWithCalendar from '@/components/DateInputWithCalendar'
import { sanitizeNotes, sanitizeInput } from '@/lib/sanitize'
import { Calendar, ChevronDown, Bell, Lightbulb } from 'lucide-react'
import Masonry from 'react-masonry-css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const appointmentSchema = yup.object({
  date: yup.string().required('Please select a date.'),
  type: yup.string().trim().required('Please enter type of appointment.')
})

// Reminder options: minutes before appointment (null = no reminder)
const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '5', label: '5 minutes before' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '45', label: '45 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '24 hours before' }
]

const getReminderLabel = (minutes) => {
  const opt = REMINDER_OPTIONS.find(o => o.value && parseInt(o.value, 10) === minutes)
  return opt ? opt.label : `${minutes} mins before`
}

/** Reminder fires at appointment time minus X minutes. Returns 24-hour time string (HH:mm) to match appointment display. */
const getReminderTimeLabel = (dateStr, timeStr, minutesBefore) => {
  if (!dateStr || !timeStr || !timeStr.match(/^\d{2}:\d{2}$/) || !minutesBefore) return ''
  const aptDate = new Date(`${dateStr}T${timeStr}:00`)
  if (isNaN(aptDate.getTime())) return ''
  const reminderDate = new Date(aptDate.getTime() - minutesBefore * 60 * 1000)
  const h = reminderDate.getHours().toString().padStart(2, '0')
  const m = reminderDate.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}



// Generate time options from 00:00 to 23:59 (15-minute intervals), same as medications reminder time
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push({ value: timeString, label: timeString })
    }
  }
  return options
}

// Treat missing/empty `time` as end-of-day (23:59). Used for upcoming vs past and panel open logic.
const getAppointmentDateTime = (apt) => {
  if (!apt?.date) return null
  const normalizedTime = typeof apt.time === 'string' && apt.time.match(/^\d{2}:\d{2}$/) ? apt.time : '23:59'
  const dt = new Date(`${apt.date}T${normalizedTime}:00`)
  if (isNaN(dt.getTime())) return null
  return dt
}

function AppointmentsPageContent() {
  const { user } = useAuth()
  const timeOptions = generateTimeOptions()
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [expandedAppointments, setExpandedAppointments] = useState(new Set())
  const [appointmentsTab, setAppointmentsTab] = useState('upcoming') // 'upcoming' | 'past'
  const [appointmentsPanelOpen, setAppointmentsPanelOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    date: today,
    time: '',
    type: '',
    clinicianName: '',
    location: '',
    notes: '',
    reminderMinutesBefore: null
  })
  const [saveError, setSaveError] = useState(null)
  const [dateError, setDateError] = useState(null)
  const appointmentDatePickerRef = useRef(null)
  /** Panel follows upcoming count (not total). Ref tracks 0↔non-zero transitions only. */
  const upcomingCountPrevRef = useRef(null)

  const fetchAppointments = async () => {
    if (!user?.id) {
      setAppointments([])
      setIsLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.APPOINTMENTS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map(row => ({
        id: row.id,
        date: row.date,
        time: row.time || '',
        type: row.type || '',
        clinicianName: row.clinician_name || '',
        location: row.location || '',
        notes: row.notes || '',
        reminderMinutesBefore: row.reminder_minutes_before ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
      setAppointments(transformed)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [user?.id])

  useEffect(() => {
    upcomingCountPrevRef.current = null
  }, [user?.id])

  useEffect(() => {
    if (isLoading) return
    const now = Date.now()
    const n = appointments.reduce((acc, apt) => {
      const dt = getAppointmentDateTime(apt)
      if (dt && dt.getTime() >= now) return acc + 1
      return acc
    }, 0)
    const prev = upcomingCountPrevRef.current
    if (prev === null) {
      setAppointmentsPanelOpen(n === 0)
    } else if (prev > 0 && n === 0) {
      setAppointmentsPanelOpen(true)
    } else if (prev === 0 && n > 0) {
      setAppointmentsPanelOpen(false)
    }
    upcomingCountPrevRef.current = n
  }, [isLoading, appointments])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (isAdding) window.scrollTo(0, 0)
  }, [isAdding])

  useEffect(() => {
    if (isAdding) setAppointmentsPanelOpen(true)
  }, [isAdding])

  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00')
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const nowMs = Date.now()
  const appointmentsWithDateTime = appointments
    .map((apt) => ({ apt, dt: getAppointmentDateTime(apt) }))
    .filter((x) => x.dt)

  const upcomingAppointments = appointmentsWithDateTime
    .filter((x) => x.dt.getTime() >= nowMs)
    .map((x) => x.apt)
    .sort((a, b) => {
      const aMs = getAppointmentDateTime(a)?.getTime() ?? 0
      const bMs = getAppointmentDateTime(b)?.getTime() ?? 0
      return aMs - bMs
    })

  const pastAppointments = appointmentsWithDateTime
    .filter((x) => x.dt.getTime() < nowMs)
    .map((x) => x.apt)
    .sort((a, b) => {
      const aMs = getAppointmentDateTime(a)?.getTime() ?? 0
      const bMs = getAppointmentDateTime(b)?.getTime() ?? 0
      return bMs - aMs
    })

  const visibleAppointments = appointmentsTab === 'past' ? pastAppointments : upcomingAppointments

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)
    setDateError(null)
    if (!formData.date) {
      setDateError('Please select a date.')
      return
    }
    try {
      const reminderVal = formData.reminderMinutesBefore ? parseInt(formData.reminderMinutesBefore, 10) : null
      const payload = {
        date: formData.date,
        time: formData.time ? sanitizeInput(formData.time) : null,
        type: formData.type ? sanitizeInput(formData.type) : null,
        clinician_name: formData.clinicianName ? sanitizeInput(formData.clinicianName) : null,
        location: formData.location ? sanitizeInput(formData.location) : null,
        notes: sanitizeNotes(formData.notes),
        reminder_minutes_before: reminderVal,
        ...(editingId ? { reminder_sent_at: null } : {})
      }

      if (editingId) {
        const { error } = await supabase
          .from(TABLES.APPOINTMENTS)
          .update(payload)
          .eq('id', parseInt(editingId))
          .eq('user_id', user.id)

        if (error) throw error

        setAppointments(prev => prev.map(apt => {
          if (apt.id !== editingId) return apt
          return {
            ...apt,
            date: payload.date,
            time: payload.time || '',
            type: payload.type || '',
            clinicianName: formData.clinicianName || '',
            location: payload.location || '',
            notes: payload.notes ?? apt.notes ?? '',
            reminderMinutesBefore: reminderVal
          }
        }))
        setEditingId(null)
        const activityKey = `flarecare-appointment-updated-${user.id}-${today}`
        localStorage.setItem(activityKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          type: formData.type || 'Appointment',
          date: formData.date
        }))
        window.dispatchEvent(new Event('appointment-updated'))
      } else {
        const { data, error } = await supabase
          .from(TABLES.APPOINTMENTS)
          .insert([{ user_id: user.id, ...payload }])
          .select()

        if (error) throw error

        const inserted = data?.[0]
        if (inserted) {
          const newApt = {
            id: inserted.id,
            date: inserted.date,
            time: inserted.time || '',
            type: inserted.type || '',
            clinicianName: inserted.clinician_name || '',
            location: inserted.location || '',
            notes: inserted.notes || '',
            reminderMinutesBefore: inserted.reminder_minutes_before ?? null,
            createdAt: inserted.created_at,
            updatedAt: inserted.updated_at
          }
          setAppointments(prev => [newApt, ...prev])
          const activityKey = `flarecare-appointment-added-${user.id}-${today}`
          localStorage.setItem(activityKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            type: formData.type || 'Appointment',
            date: formData.date
          }))
          window.dispatchEvent(new Event('appointment-added'))
        } else {
          await fetchAppointments()
        }
      }

      setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '', reminderMinutesBefore: null })
      setIsAdding(false)
    } catch (error) {
      console.error('Error saving appointment:', error)
      setSaveError(error?.message || 'Failed to save. Please try again.')
    }
  }

  const startEdit = (apt) => {
    setSaveError(null)
    setDateError(null)
    setFormData({
      date: apt.date,
      time: apt.time || '',
      type: apt.type || '',
      clinicianName: apt.clinicianName || '',
      location: apt.location || '',
      notes: apt.notes || '',
      reminderMinutesBefore: apt.reminderMinutesBefore ?? null
    })
    setEditingId(apt.id)
    setIsAdding(true)
  }

  const startAdding = () => {
    setSaveError(null)
    setDateError(null)
    setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '', reminderMinutesBefore: null })
    setEditingId(null)
    setIsAdding(true)
  }

  const cancelEdit = () => {
    setSaveError(null)
    setDateError(null)
    setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '', reminderMinutesBefore: null })
    setEditingId(null)
    setIsAdding(false)
  }

  const confirmDelete = async () => {
    if (!deleteModal.id || !user?.id) return
    try {
      const { error } = await supabase
        .from(TABLES.APPOINTMENTS)
        .delete()
        .eq('id', parseInt(deleteModal.id))
        .eq('user_id', user.id)

      if (error) throw error
      setAppointments(prev => prev.filter(a => a.id !== deleteModal.id))
      setDeleteModal({ isOpen: false, id: null })
      const today = new Date().toISOString().split('T')[0]
      const activityKey = `flarecare-appointment-deleted-${user.id}-${today}`
      localStorage.setItem(activityKey, JSON.stringify({
        timestamp: new Date().toISOString()
      }))
      window.dispatchEvent(new Event('appointment-deleted'))
    } catch (error) {
      console.error('Error deleting appointment:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const closeDeleteModal = () => setDeleteModal({ isOpen: false, id: null })

  const toggleAppointmentExpand = (id) => {
    setExpandedAppointments(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4 sm:mb-6">
                My Appointments
              </h1>
              <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
                Manage your appointments to keep track of past and upcoming visits.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6 min-w-0">
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="appointments-panel-trigger"
            aria-expanded={appointmentsPanelOpen}
            aria-controls="appointments-list-panel"
            aria-label={appointmentsPanelOpen ? 'Collapse your appointments' : 'Expand your appointments'}
            onClick={() => setAppointmentsPanelOpen((o) => !o)}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-2 -m-2 shadow-none cursor-pointer [-webkit-tap-highlight-color:transparent] text-secondary hover:opacity-70 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5F9EA0]/45 focus-visible:ring-offset-0 touch-manipulation"
          >
            <ChevronDown
              className={`h-5 w-5 shrink-0 transition-transform duration-200 ${appointmentsPanelOpen ? 'rotate-180' : ''}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
          <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600/50 dashboard-icon-panel">
            {isAdding ? (
              <svg className="w-5 h-5 text-slate-700 dark:[color:var(--text-icon-more-appointments)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ) : (
              <Calendar className="w-5 h-5 text-slate-700 dark:[color:var(--text-icon-more-appointments)]" />
            )}
          </div>
          <h2 id="appointments-panel-heading" className="min-w-0 flex-1 text-xl font-semibold font-title text-primary m-0">
            <button
              type="button"
              className="sm:hidden w-full min-w-0 text-left text-xl font-semibold font-title text-primary bg-transparent border-0 p-0 min-h-11 flex items-center cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] rounded-md -ml-1 pl-1 pr-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5F9EA0]/45 focus-visible:ring-offset-0"
              onClick={() => setAppointmentsPanelOpen((o) => !o)}
              aria-expanded={appointmentsPanelOpen}
              aria-controls="appointments-list-panel"
            >
              Appointments
            </button>
            <span className="hidden sm:inline">Appointments</span>
          </h2>
          {appointmentsPanelOpen && !isAdding && (
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
          {appointmentsPanelOpen && (
            <motion.div
              key="appointments-panel"
              id="appointments-list-panel"
              role="region"
              aria-labelledby="appointments-panel-heading"
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
                  <label htmlFor="apt-date" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                    Date *
                  </label>
                  <input
                    type="hidden"
                    value={formData.date || ''}
                    required
                    readOnly
                    aria-hidden
                  />
                  <div className="w-full sm:max-w-[150px]">
                  <DatePicker
                    ref={appointmentDatePickerRef}
                    id="apt-date"
                    selected={formData.date ? new Date(formData.date + 'T12:00:00') : null}
                    onChange={(date) => {
                      setDateError(null)
                      setFormData(prev => ({
                        ...prev,
                        date: date ? date.toISOString().split('T')[0] : ''
                      }))
                    }}
                    placeholderText="Select date"
                    customInput={<DateInputWithCalendar onIconClick={() => appointmentDatePickerRef.current?.setOpen?.(true)} />}
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                    preventOpenOnFocus
                    wrapperClassName="w-full"
                    enableTabLoop={false}
                  />
                  </div>
                  {dateError && (
                    <p className="text-sm font-roboto mt-1" role="alert" style={{ color: 'var(--text-cadet-blue)' }}>{dateError}</p>
                  )}
                </div>
                <div className="w-full">
                  <label htmlFor="apt-time" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                    Time *
                  </label>
                  <select
                    id="apt-time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value || '' }))}
                    className={`input-field-wizard w-full sm:max-w-[150px] ${formData.time ? 'has-value' : 'placeholder'}`}
                    required
                  >
                    <option value="">Select time</option>
                    {timeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="apt-type" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Type of appointment *
                </label>
                <input
                  type="text"
                  id="apt-type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="e.g. GP, Surgical, MRI, Endoscopy"
                  className="input-field-wizard w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="apt-clinician" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Name of clinician
                </label>
                <input
                  type="text"
                  id="apt-clinician"
                  value={formData.clinicianName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinicianName: e.target.value }))}
                  placeholder="e.g. Dr Smith"
                  className="input-field-wizard w-full"
                />
              </div>
              <div>
                <label htmlFor="apt-location" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Location *
                </label>
                <input
                  type="text"
                  id="apt-location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. St Mary's Hospital"
                  className="input-field-wizard w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="apt-notes" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Notes
                </label>
                <textarea
                  id="apt-notes"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Bring medication list"
                  className="w-full px-4 py-3 input-field-wizard resize-none"
                />
              </div>
              <div>
                <label htmlFor="apt-reminder" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                  Remind me
                </label>
                <select
                  id="apt-reminder"
                  value={formData.reminderMinutesBefore ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reminderMinutesBefore: e.target.value ? parseInt(e.target.value, 10) : null
                  }))}
                  className={`input-field-wizard w-full ${formData.reminderMinutesBefore ? 'has-value' : 'placeholder'}`}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {saveError && (
                <p className="text-sm font-roboto" role="alert" style={{ color: 'var(--text-cadet-blue)' }}>{saveError}</p>
              )}
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

        {!isAdding && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setAppointmentsTab('upcoming')
                setExpandedAppointments(new Set())
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                appointmentsTab === 'upcoming'
                  ? 'bg-[#5F9EA0] text-white border-transparent'
                  : 'bg-[var(--bg-card)] dark:bg-[var(--bg-icon-container)] text-primary border-[var(--border-primary)]'
              }`}
              aria-pressed={appointmentsTab === 'upcoming'}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => {
                setAppointmentsTab('past')
                setExpandedAppointments(new Set())
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                appointmentsTab === 'past'
                  ? 'bg-[#5F9EA0] text-white border-transparent'
                  : 'bg-[var(--bg-card)] dark:bg-[var(--bg-icon-container)] text-primary border-[var(--border-primary)]'
              }`}
              aria-pressed={appointmentsTab === 'past'}
            >
              Past
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-center py-12 text-secondary font-roboto">Loading...</p>
        ) : visibleAppointments.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
              <Calendar className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-title text-primary mb-2">
              {appointmentsTab === 'past' ? 'No past appointments' : 'No upcoming appointments'}
            </h3>
            <p className="text-sm font-roboto text-secondary max-w-md mx-auto leading-relaxed">
              {appointmentsTab === 'past'
                ? 'Your past appointments will appear here once they have taken place.'
                : 'Your appointments will show here once you add them'}
            </p>
          </div>
        ) : (
          <Masonry
            breakpointCols={{ default: 2, 1024: 2, 640: 1 }}
            className="flex -ml-4 w-auto min-w-0"
            columnClassName="pl-4 bg-clip-padding"
          >
            {visibleAppointments.map((apt) => {
              const isExpanded = expandedAppointments.has(apt.id)
              return (
                <div key={apt.id} className="mb-4 last:mb-0">
                  <div className="card-inner p-4 sm:p-6 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1 text-sm">
                            <span className="font-semibold text-primary truncate">{formatUKDate(apt.date)}</span>
                            {apt.time && (
                              <>
                                <span className="text-secondary">·</span>
                                <span className="text-primary font-roboto truncate">{apt.time}</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAppointmentExpand(apt.id)}
                            className="flex-shrink-0 p-1 rounded transition-colors hover:bg-opacity-20 sm:self-start"
                            style={{ color: 'var(--text-icon)' }}
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            <ChevronDown
                              className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                        {apt.type && (
                          <p className="text-xs sm:text-sm font-medium text-primary mt-1 truncate" title={apt.type}>{apt.type}</p>
                        )}
                        <motion.div
                          initial={false}
                          animate={{
                            height: isExpanded ? 'auto' : 0,
                            opacity: isExpanded ? 1 : 0
                          }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                            {apt.reminderMinutesBefore && (
                              <div className="flex flex-row flex-nowrap items-center gap-3 mt-3 mb-3">
                                {apt.time && getReminderTimeLabel(apt.date, apt.time, apt.reminderMinutesBefore) && (
                                  <span
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium font-roboto shrink-0 bg-white text-black"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {getReminderTimeLabel(apt.date, apt.time, apt.reminderMinutesBefore)}
                                  </span>
                                )}
                                <span
                                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium font-roboto shrink-0"
                                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-cadet-blue)' }}
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  {getReminderLabel(apt.reminderMinutesBefore)}
                                </span>
                              </div>
                            )}
                            {apt.clinicianName && (
                              <p className="text-xs sm:text-sm text-secondary font-roboto mt-0.5 truncate" title={apt.clinicianName}>{apt.clinicianName}</p>
                            )}
                            {apt.location && (
                              <p className="text-xs sm:text-sm text-secondary font-roboto truncate" title={apt.location}>{apt.location}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => startEdit(apt)}
                                disabled={editingId === apt.id}
                                className="btn-card-icon-action"
                                title={editingId === apt.id ? 'Finish or cancel editing first' : 'Edit appointment'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteModal({ isOpen: true, id: apt.id })}
                                disabled={editingId === apt.id}
                                className="btn-card-icon-action"
                                title={editingId === apt.id ? 'Finish or cancel editing first' : 'Delete appointment'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                        </motion.div>
                      </div>
                    </div>

                    {isExpanded && apt.notes && (
                      <div className="mt-2 min-w-0">
                        <div className="card-inner min-w-0">
                          <p className="text-sm text-secondary font-roboto leading-normal line-clamp-2" title={apt.notes}>
                            <span className="font-semibold text-primary">Notes:</span> {apt.notes}
                          </p>
                        </div>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-2 text-xs text-tertiary font-roboto">
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Added {apt.createdAt ? formatUKDate(apt.createdAt) : '—'}
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

      {/* Appointment Reminders Info */}
      <div className="mt-4 sm:mt-6 card">
        <div>
          <h3 className="text-xl sm:text-lg font-semibold font-title text-primary mb-2 flex items-center space-x-2">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }} />
            <span>Appointment Reminders</span>
          </h3>
          <p className="text-sm text-secondary font-roboto leading-relaxed">
            Get notified so you do not miss an appointment, in your browser or on your device.
          </p>
          <div className="card-inner p-5 sm:p-6 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <span className="text-base sm:text-sm font-semibold text-primary font-title">Important:</span>
            </div>
            <p className="text-xs text-secondary font-roboto leading-relaxed">
              Enable Push notifications in Account settings to get reminders when the app is closed.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete appointment?"
        message="This appointment will be removed. Are you sure you want to delete it?"
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <AppointmentsPageContent />
    </ProtectedRoute>
  )
}
