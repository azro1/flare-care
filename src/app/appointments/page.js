'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes, sanitizeInput } from '@/lib/sanitize'
import { Calendar, ChevronDown, Bell, Lightbulb } from 'lucide-react'
import Masonry from 'react-masonry-css'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const appointmentSchema = yup.object({
  date: yup.string().required('Please select a date.'),
  type: yup.string().trim().required('Please enter type of appointment.')
})

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

function AppointmentsPageContent() {
  const { user } = useAuth()
  const timeOptions = generateTimeOptions()
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [expandedAppointments, setExpandedAppointments] = useState(new Set())
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    date: today,
    time: '',
    type: '',
    clinicianName: '',
    location: '',
    notes: ''
  })
  const [saveError, setSaveError] = useState(null)
  const [dateError, setDateError] = useState(null)

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
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true, nullsFirst: false })

      if (error) throw error

      const transformed = (data || []).map(row => ({
        id: row.id,
        date: row.date,
        time: row.time || '',
        type: row.type || '',
        clinicianName: row.clinician_name || '',
        location: row.location || '',
        notes: row.notes || '',
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
    if (isAdding) window.scrollTo(0, 0)
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
    setSaveError(null)
    setDateError(null)
    if (!formData.date) {
      setDateError('Please select a date.')
      return
    }
    try {
      const payload = {
        date: formData.date,
        time: formData.time ? sanitizeInput(formData.time) : null,
        type: formData.type ? sanitizeInput(formData.type) : null,
        clinician_name: formData.clinicianName ? sanitizeInput(formData.clinicianName) : null,
        location: formData.location ? sanitizeInput(formData.location) : null,
        notes: sanitizeNotes(formData.notes)
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
            id: apt.id,
            date: payload.date,
            time: payload.time || '',
            type: payload.type || '',
            clinicianName: formData.clinicianName || '',
            location: payload.location || '',
            notes: payload.notes ?? apt.notes ?? '',
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt
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
          setAppointments(prev => [{
            id: inserted.id,
            date: inserted.date,
            time: inserted.time || '',
            type: inserted.type || '',
            clinicianName: inserted.clinician_name || '',
            location: inserted.location || '',
            notes: inserted.notes || '',
            createdAt: inserted.created_at,
            updatedAt: inserted.updated_at
          }, ...prev])
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

      setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '' })
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
      notes: apt.notes || ''
    })
    setEditingId(apt.id)
    setIsAdding(true)
  }

  const startAdding = () => {
    setSaveError(null)
    setDateError(null)
    setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '' })
    setEditingId(null)
    setIsAdding(true)
  }

  const cancelEdit = () => {
    setSaveError(null)
    setDateError(null)
    setFormData({ date: today, time: '', type: '', clinicianName: '', location: '', notes: '' })
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
      <div className="mb-4 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">
                Appointments
              </h1>
              <p className="text-secondary font-roboto">
                Add your clinic appointments in one place so you never miss one
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 sm:mb-6 min-w-0">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center min-w-0">
            <div className="flex w-10 h-10 bg-sky-100 dashboard-icon-panel rounded-lg items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <Calendar className="w-5 h-5 text-sky-600 dark:text-white" />
            </div>
            <h2 className="text-xl font-semibold font-source text-primary">
              Your appointments
            </h2>
          </div>
          {!isAdding && (
            <button
              onClick={startAdding}
              className="button-cadet flex-shrink-0 px-4 py-2 text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mb-6 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="grid sm:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label htmlFor="apt-date" className="block text-base font-semibold font-roboto text-primary mb-3">
                    Date *
                  </label>
                  <input
                    type="hidden"
                    value={formData.date || ''}
                    required
                    readOnly
                    aria-hidden
                  />
                  <DatePicker
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
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                    className="input-field-wizard w-full"
                    enableTabLoop={false}
                  />
                  {dateError && (
                    <p className="text-sm font-roboto mt-1" role="alert" style={{ color: 'var(--text-cadet-blue)' }}>{dateError}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="apt-time" className="block text-base font-semibold font-roboto text-primary mb-3">
                    Time *
                  </label>
                  <select
                    id="apt-time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value || '' }))}
                    className={`input-field-wizard w-full ${formData.time ? 'has-value' : 'placeholder'}`}
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
                <label htmlFor="apt-type" className="block text-base font-semibold font-roboto text-primary mb-3">
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
                <label htmlFor="apt-clinician" className="block text-base font-semibold font-roboto text-primary mb-3">
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
                <label htmlFor="apt-location" className="block text-base font-semibold font-roboto text-primary mb-3">
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
                <label htmlFor="apt-notes" className="block text-base font-semibold font-roboto text-primary mb-3">
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
              {saveError && (
                <p className="text-sm font-roboto" role="alert" style={{ color: 'var(--text-cadet-blue)' }}>{saveError}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="submit" className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors">
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-lg font-semibold rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-button-cancel)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
        {isLoading ? (
          <p className="text-center py-12 text-secondary font-roboto">Loading...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
              <Calendar className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-source text-primary mb-2">No upcoming appointments</h3>
            <p className="font-roboto text-secondary max-w-md mx-auto">
              Add appointments to keep track of your healthcare
            </p>
          </div>
        ) : (
          <Masonry
            breakpointCols={{ default: 2, 1024: 2, 640: 1 }}
            className="flex -ml-4 w-auto min-w-0"
            columnClassName="pl-4 bg-clip-padding"
          >
            {appointments.map((apt) => {
              const isExpanded = expandedAppointments.has(apt.id)
              return (
                <div key={apt.id} className="mb-4 last:mb-0">
                  <div className="card-inner p-4 sm:p-6 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 ${isExpanded ? 'mb-1' : ''} min-w-0`}>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1">
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
                          <p className="font-medium text-primary mt-1 truncate" title={apt.type}>{apt.type}</p>
                        )}
                        {isExpanded && (
                          <>
                            {apt.clinicianName && (
                              <p className="text-sm text-secondary font-roboto mt-0.5 truncate" title={apt.clinicianName}>{apt.clinicianName}</p>
                            )}
                            {apt.location && (
                              <p className="text-sm text-secondary font-roboto truncate" title={apt.location}>{apt.location}</p>
                            )}
                            {apt.notes && (
                              <div className="mt-1 min-w-0 max-w-full overflow-hidden" title={apt.notes}>
                                <p className="text-sm text-secondary font-roboto break-words line-clamp-2">{apt.notes}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(apt)}
                          disabled={editingId === apt.id}
                          className="p-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-icon)' }}
                          title={editingId === apt.id ? 'Finish or cancel editing first' : 'Edit appointment'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModal({ isOpen: true, id: apt.id })}
                          disabled={editingId === apt.id}
                          className="p-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-icon)' }}
                          title={editingId === apt.id ? 'Finish or cancel editing first' : 'Delete appointment'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 text-xs text-tertiary font-roboto" style={{ borderTop: '1px solid', borderColor: 'var(--border-card-inner)' }}>
                      <div className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Added {apt.createdAt ? formatUKDate(apt.createdAt) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </Masonry>
        )}
        </div>
      </div>

      {/* Appointment Reminders Info */}
      <div className="mt-4 sm:mt-6 card">
        <div>
          <h3 className="text-xl sm:text-lg font-semibold font-source text-primary mb-2 flex items-center space-x-2">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }} />
            <span>Appointment Reminders</span>
          </h3>
          <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
            FlareCare can send reminders so you don't miss an appointment — in your browser or as push notifications on your device.
          </p>
          <div className="card-inner p-6 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-white" />
              <span className="text-base sm:text-sm font-medium text-primary font-roboto">Important to know:</span>
            </div>
            <p className="text-sm text-secondary font-roboto leading-relaxed">
              Enable push notifications in Account → Settings to get reminders even when the app is closed. When adding or editing an appointment, choose how far in advance you want to be reminded.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete appointment?"
        message="This appointment will be removed. You can add a new one anytime."
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
