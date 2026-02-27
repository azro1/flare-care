'use client'

import { useState, useEffect } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes } from '@/lib/sanitize'
import { Scale, ChevronDown } from 'lucide-react'
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
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center min-w-0">
            <div className="flex w-10 h-10 bg-indigo-100 dashboard-icon-panel rounded-lg items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <Scale className="w-5 h-5 text-indigo-600 dark:text-white" />
            </div>
            <h2 className="text-xl font-semibold font-source text-primary">
              Weight entries
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
                  <label htmlFor="weight-date" className="block text-sm sm:text-base font-semibold font-roboto text-primary mb-2 sm:mb-3">
                    Date *
                  </label>
                  <DatePicker
                    id="weight-date"
                    selected={formData.date ? new Date(formData.date + 'T12:00:00') : null}
                    onChange={(date) => setFormData(prev => ({
                      ...prev,
                      date: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    placeholderText="Select date"
                    dateFormat="dd/MM/yyyy"
                    maxDate={new Date()}
                    className="input-field-wizard w-full"
                    enableTabLoop={false}
                  />
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
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
              <Scale className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-source text-primary mb-2">No weight entries</h3>
            <p className="text-sm font-roboto text-secondary max-w-md mx-auto leading-relaxed">
              Your weight entries will show here once you add them
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => {
              const isExpanded = expandedWeightEntries.has(entry.id)
              return (
                <li key={entry.id} className="card-inner p-4 sm:p-6 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 ${isExpanded ? 'mb-1' : ''} min-w-0`}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1">
                          <span className="font-semibold text-primary">{formatUKDate(entry.date)}</span>
                          <span className="text-secondary">·</span>
                          <span className="text-primary font-roboto">{Number(entry.valueKg)} kg</span>
                        </div>
                        {entry.notes?.trim() && (
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
                        )}
                      </div>
                      {isExpanded && entry.notes && (
                        <div className="mt-1 min-w-0 max-w-full overflow-hidden" title={entry.notes}>
                          <p className="text-sm text-secondary font-roboto break-words line-clamp-2">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        disabled={editingId === entry.id}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-icon)'
                        }}
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
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-icon)'
                        }}
                        title={editingId === entry.id ? 'Finish or cancel editing first' : 'Delete entry'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      Added {formatUKDate(entry.createdAt)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete weight entry?"
        message="This entry will be removed. You can add a new entry anytime."
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
