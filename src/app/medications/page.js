'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import SyncSettings from '@/components/SyncSettings'
import reminderService from '@/lib/reminderService'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeMedicationName, sanitizeNotes } from '@/lib/sanitize'
import { Pill } from 'lucide-react'

function MedicationsPageContent() {
  const { data: medications, setData: setMedications, deleteData: deleteMedication, syncEnabled, setSyncEnabled, isOnline, isSyncing, syncToCloud, fetchFromCloud } = useDataSync('flarecare-medications', [])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    timeOfDay: '',
    customTime: '',
    remindersEnabled: false,
    notes: ''
  })


  const timeOptions = [
    { value: 'custom', label: 'Custom Time' },
    { value: '07:00', label: '07:00' },
    { value: '08:00', label: '08:00' },
    { value: '09:00', label: '09:00' },
    { value: '10:00', label: '10:00' },
    { value: '11:00', label: '11:00' },
    { value: '12:00', label: '12:00' },
    { value: '13:00', label: '13:00' },
    { value: '14:00', label: '14:00' },
    { value: '15:00', label: '15:00' },
    { value: '16:00', label: '16:00' },
    { value: '17:00', label: '17:00' },
    { value: '18:00', label: '18:00' },
    { value: '19:00', label: '19:00' },
    { value: '20:00', label: '20:00' },
    { value: '21:00', label: '21:00' },
    { value: '22:00', label: '22:00' },
    { value: 'as-needed', label: 'As Needed' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter a medication name.')
      return
    }

    if (editingId) {
      // Update existing medication
      setMedications(medications.map(med => 
        med.id === editingId 
          ? { ...med, ...formData, name: sanitizeMedicationName(formData.name), notes: sanitizeNotes(formData.notes), updatedAt: new Date().toISOString() }
          : med
      ))
      setEditingId(null)
    } else {
      // Add new medication
      const newMedication = {
        id: Date.now().toString(),
        ...formData,
        name: sanitizeMedicationName(formData.name),
        notes: sanitizeNotes(formData.notes),
        createdAt: new Date().toISOString()
      }
      setMedications([...medications, newMedication])
    }

    setFormData({
      name: '',
      dosage: '',
      timeOfDay: '7:00',
      customTime: '',
      remindersEnabled: true,
      notes: ''
    })
    setIsAdding(false)
  }

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target
    
    console.log('Input change:', { name, value, type, checked })
    console.log('Notification permission:', Notification.permission)
    
    // Request notification permission when reminders checkbox is checked
    if (name === 'remindersEnabled' && checked && Notification.permission === 'default') {
      console.log('Requesting notification permission...')
      await Notification.requestPermission()
      console.log('Permission result:', Notification.permission)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const startEdit = (medication) => {
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      timeOfDay: medication.timeOfDay || '7:00',
      customTime: medication.customTime || '',
      remindersEnabled: medication.remindersEnabled !== false,
      notes: medication.notes || ''
    })
    setEditingId(medication.id)
    setIsAdding(true)
  }

  const startAdding = () => {
    setFormData({
      name: '',
      dosage: '',
      timeOfDay: '',
      customTime: '',
      remindersEnabled: false,
      notes: ''
    })
    setEditingId(null)
    setIsAdding(true)
  }

  const cancelEdit = () => {
    setFormData({
      name: '',
      dosage: '',
      timeOfDay: '',
      customTime: '',
      remindersEnabled: false,
      notes: ''
    })
    setEditingId(null)
    setIsAdding(false)
  }

  // Update global reminder service when medications change
  useEffect(() => {
    console.log('=== MEDICATIONS CHANGED ===')
    console.log('Medications array:', medications)
    medications.forEach((med, index) => {
      console.log(`Medication ${index}:`, {
        name: med.name,
        timeOfDay: med.timeOfDay,
        customTime: med.customTime,
        remindersEnabled: med.remindersEnabled,
        updatedAt: med.updatedAt
      })
    })
    
    reminderService.updateMedications(medications)
    
    // Start the reminder service if there are medications with reminders enabled
    const medicationsWithReminders = medications.filter(med => med.remindersEnabled)
    console.log('Medications with reminders enabled:', medicationsWithReminders)
    
    if (medicationsWithReminders.length > 0) {
      console.log('Starting reminder service...')
      reminderService.start(medications)
    } else {
      console.log('No medications with reminders, stopping service...')
      reminderService.stop()
    }
  }, [medications])

  const handleDeleteMedication = (id) => {
    setDeleteModal({ isOpen: true, id })
  }

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await deleteMedication(deleteModal.id)
    }
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: null })
  }

  const getTimeOfDayColor = (timeOfDay) => {
    const colors = {
      '7:00': 'bg-yellow-100 text-yellow-800',
      '8:00': 'bg-yellow-100 text-yellow-800',
      '9:00': 'bg-yellow-100 text-yellow-800',
      '10:00': 'bg-yellow-100 text-yellow-800',
      '11:00': 'bg-yellow-100 text-yellow-800',
      '12:00': 'bg-orange-100 text-orange-800',
      '13:00': 'bg-orange-100 text-orange-800',
      '14:00': 'bg-orange-100 text-orange-800',
      '15:00': 'bg-orange-100 text-orange-800',
      '16:00': 'bg-orange-100 text-orange-800',
      '17:00': 'bg-purple-100 text-purple-800',
      '18:00': 'bg-purple-100 text-purple-800',
      '19:00': 'bg-purple-100 text-purple-800',
      '20:00': 'bg-purple-100 text-purple-800',
      '21:00': 'bg-blue-100 text-blue-800',
      '22:00': 'bg-blue-100 text-blue-800',
      'as-needed': 'bg-gray-100 text-gray-800',
      'custom': 'bg-indigo-100 text-indigo-800'
    }
    return colors[timeOfDay] || 'bg-gray-100 text-gray-800'
  }

  const getTimeOfDayLabel = (medication) => {
    if (medication.timeOfDay === 'custom' && medication.customTime) {
      const time = new Date(`2000-01-01T${medication.customTime}`)
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    const option = timeOptions.find(opt => opt.value === medication.timeOfDay)
    return option ? option.label : medication.timeOfDay
  }

  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 min-w-0">
      {/* Header Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-3 sm:mb-4">
              Manage Your Medications
            </h1>
            <p className="text-secondary font-roboto">
              Add your prescribed medications, set up reminders, and keep track of your medication schedule.
            </p>
          </div>
          <div className="sm:ml-6 flex-shrink-0">
            <SyncSettings 
              syncEnabled={syncEnabled}
              setSyncEnabled={setSyncEnabled}
              isOnline={isOnline}
              isSyncing={isSyncing}
              syncToCloud={syncToCloud}
              fetchFromCloud={fetchFromCloud}
            />
          </div>
        </div>
      </div>

      {/* Your Medications Section */}
      <div className="card p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center">
            <div className="hidden sm:flex w-12 h-12 icon-container dark:bg-gray-700 rounded-xl items-center justify-center mr-4">
              {isAdding ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <Pill className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-xl font-semibold font-source text-primary">
              {isAdding ? (editingId ? 'Edit Medication' : 'Add New Medication') : 'Your Medications'}
            </h2>
          </div>
          {!isAdding && (
            <button
              onClick={startAdding}
              className="px-4 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 self-start sm:self-auto"
              style={{ backgroundColor: 'var(--bg-button-cadet)', color: 'var(--text-white)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-button-cadet-hover)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-button-cadet)'}
            >
              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Medication
            </button>
          )}
        </div>

        {/* Add/Edit Medication Form */}
        {isAdding && (
          <div className="mb-8 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label htmlFor="name" className="block text-base font-semibold font-roboto text-primary mb-3">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Medication name"
                    className="input-field-wizard"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dosage" className="block text-base font-semibold font-roboto text-primary mb-3">
                    Dosage (per day)
                  </label>
                  <input
                    type="text"
                    id="dosage"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    placeholder="e.g., 500mg"
                    className="input-field-wizard"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label className="block text-base font-semibold font-roboto text-primary mb-3">
                    Reminder Time
                  </label>
                  <DatePicker
                    selected={formData.timeOfDay && formData.timeOfDay !== 'custom' && formData.timeOfDay !== 'as-needed' 
                      ? new Date(`2000-01-01T${formData.timeOfDay}`) 
                      : null}
                    onChange={(time) => {
                      if (time) {
                        const hours = time.getHours().toString().padStart(2, '0')
                        const minutes = time.getMinutes().toString().padStart(2, '0')
                        setFormData(prev => ({ ...prev, timeOfDay: `${hours}:${minutes}` }))
                      } else {
                        setFormData(prev => ({ ...prev, timeOfDay: '' }))
                      }
                    }}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={1}
                    timeCaption="Time"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    placeholderText="Select time"
                    minTime={new Date(2000, 0, 1, 0, 0)}
                    maxTime={new Date(2000, 0, 1, 23, 59)}
                    className="input-field-wizard"
                  />
                </div>

                {formData.timeOfDay === 'custom' && (
                  <div>
                    <label className="block text-base font-semibold font-roboto text-primary mb-3">
                      Custom Time
                    </label>
                    <DatePicker
                      selected={formData.customTime 
                        ? new Date(`2000-01-01T${formData.customTime}`) 
                        : null}
                      onChange={(time) => {
                        if (time) {
                          const hours = time.getHours().toString().padStart(2, '0')
                          const minutes = time.getMinutes().toString().padStart(2, '0')
                          setFormData(prev => ({ ...prev, customTime: `${hours}:${minutes}` }))
                        } else {
                          setFormData(prev => ({ ...prev, customTime: '' }))
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={1}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholderText="Select time"
                      minTime={new Date(2000, 0, 1, 0, 0)}
                      maxTime={new Date(2000, 0, 1, 23, 59)}
                      className="w-full px-2 py-1.5 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{ 
                        backgroundColor: 'var(--bg-input)', 
                        border: '2px solid',
                        borderColor: 'var(--border-input)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start sm:items-center card-inner rounded-2xl p-4">
                 <input
                   type="checkbox"
                   id="remindersEnabled"
                   name="remindersEnabled"
                   checked={formData.remindersEnabled}
                   onChange={handleInputChange}
                   className="h-5 w-5 sm:h-4 sm:w-4 focus:ring-0 focus:outline-none border-2 rounded"
                   style={{ 
                     borderColor: 'var(--border-input)',
                     accentColor: 'var(--bg-button-cadet)'
                   }}
                 />
                <label htmlFor="remindersEnabled" className="ml-3 block text-base font-roboto text-primary">
                  Enable reminder notifications for this medication
                </label>
              </div>

              <div>
                <label htmlFor="notes" className="block text-base font-semibold font-roboto text-primary mb-3">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions, side effects to watch for, etc."
                  className="w-full px-4 py-3 input-field-wizard resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  type="submit" 
                  className="px-8 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'var(--bg-button-cadet)', color: 'var(--text-white)' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-button-cadet-hover)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-button-cadet)'}
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingId ? 'Update' : 'Add Medication'}
                </button>
                <button 
                  type="button" 
                  onClick={cancelEdit} 
                  className="px-8 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  style={{ 
                    backgroundColor: 'var(--bg-button-cancel)', 
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-button-cancel-hover)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-button-cancel)'}
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {medications.filter(med => med.name !== 'Medication Tracking').length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Pill className="w-10 h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-source text-primary mb-2">No medications added yet</h3>
            <p className="font-roboto text-secondary max-w-md mx-auto">Add your medications to keep track of them and set up reminders to help you stay on schedule.</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            {medications.filter(med => med.name !== 'Medication Tracking').map((medication) => (
              <div key={medication.id} className="card p-4 sm:p-6 min-w-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold font-source text-primary mb-2 break-words">
                      {medication.name}
                    </h3>
                    {medication.dosage && (
                      <p className="text-base text-secondary mb-3 font-roboto break-words">
                        <span className="font-semibold">Dosage:</span> {medication.dosage}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {medication.timeOfDay && (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium font-roboto ${getTimeOfDayColor(medication.timeOfDay)}`}>
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getTimeOfDayLabel(medication)}
                        </span>
                      )}
                      {medication.remindersEnabled !== false && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium font-roboto card-inner">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span style={{ color: 'var(--text-cadet-blue)' }}>Reminders On</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => startEdit(medication)}
                      className="w-10 h-10 icon-container dark:bg-gray-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Edit medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(medication.id)}
                      className="w-10 h-10 icon-container dark:bg-gray-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Delete medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {medication.notes && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid', borderColor: 'var(--border-card-inner)' }}>
                    <div className="card-inner rounded-xl p-3">
                      <p className="text-sm text-secondary font-roboto">
                        <span className="font-semibold text-primary">Notes:</span> {medication.notes}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 text-xs text-tertiary font-roboto" style={{ borderTop: '1px solid', borderColor: 'var(--border-card-inner)' }}>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Added {formatUKDate(medication.createdAt)}
                    {medication.updatedAt && medication.updatedAt !== medication.createdAt && (
                      <span> • Updated {formatUKDate(medication.updatedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Reminder Info */}
      <div className="mt-6 sm:mt-8 card p-4 md:p-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold font-source text-primary mb-1 sm:mb-2 flex items-center space-x-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Medication Reminders</span>
          </h3>
          <p className="text-sm sm:text-base text-secondary mb-2 sm:mb-3 font-roboto leading-relaxed">
            FlareCare will send browser notifications when it's time to take your medications.
          </p>
          <div className="card-inner rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center space-x-1">
              <span className="text-base sm:text-lg">💡</span>
              <p className="text-xs sm:text-sm font-medium text-primary mb-1 font-roboto">Important to know:</p>
            </div>
            <p className="text-xs sm:text-sm text-secondary font-roboto leading-relaxed">
              Reminders only work in your web browser. They won't show up as push notifications on your phone. 
              You can turn reminders on or off for each medication.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Medication"
        message="Are you sure you want to delete this medication? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  )
}

export default function MedicationsPage() {
  return (
    <ProtectedRoute>
      <MedicationsPageContent />
    </ProtectedRoute>
  )
}
