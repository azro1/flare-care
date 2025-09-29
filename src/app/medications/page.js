'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import SyncSettings from '@/components/SyncSettings'
import reminderService from '@/lib/reminderService'
import TimePicker from '@/components/TimePicker'
import DatePicker from '@/components/DatePicker'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeMedicationName, sanitizeNotes, sanitizeFoodTriggers } from '@/lib/sanitize'

function MedicationsPageContent() {
  const { data: medications, setData: setMedications, deleteData: deleteMedication, syncEnabled, setSyncEnabled, isOnline, isSyncing, syncToCloud, fetchFromCloud } = useDataSync('flarecare-medications', [])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    timeOfDay: '07:00',
    customTime: '',
    remindersEnabled: false,
    notes: ''
  })
  const [medicationTracking, setMedicationTracking] = useState({
    missedMedications: false,
    missedMedicationsList: [{ medication: '', timeOfDay: '', date: new Date().toISOString().split('T')[0] }],
    nsaidUsage: false,
    nsaidList: [{ details: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }],
    antibioticUsage: false,
    antibioticList: [{ details: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
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

  const cancelEdit = () => {
    setFormData({
      name: '',
      dosage: '',
      timeOfDay: '07:00',
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

  // Medication tracking helper functions
  const addMissedMedication = () => {
    setMedicationTracking(prev => ({
      ...prev,
      missedMedicationsList: [...prev.missedMedicationsList, { medication: '', timeOfDay: '', date: new Date().toISOString().split('T')[0] }]
    }))
  }

  const removeMissedMedication = (index) => {
    setMedicationTracking(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.filter((_, i) => i !== index)
    }))
  }

  const updateMissedMedication = (index, field, value) => {
    setMedicationTracking(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addNsaid = () => {
    setMedicationTracking(prev => ({
      ...prev,
      nsaidList: [...prev.nsaidList, { details: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
    }))
  }

  const removeNsaid = (index) => {
    setMedicationTracking(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.filter((_, i) => i !== index)
    }))
  }

  const updateNsaid = (index, field, value) => {
    setMedicationTracking(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addAntibiotic = () => {
    setMedicationTracking(prev => ({
      ...prev,
      antibioticList: [...prev.antibioticList, { details: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
    }))
  }

  const removeAntibiotic = (index) => {
    setMedicationTracking(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.filter((_, i) => i !== index)
    }))
  }

  const updateAntibiotic = (index, field, value) => {
    setMedicationTracking(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleMedicationTrackingChange = (e) => {
    const { name, value, type, checked } = e.target
    setMedicationTracking(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value === 'true'
    }))
  }

  // Auto-save medication tracking to medications list when data changes
  useEffect(() => {
    if (medicationTracking.missedMedications || medicationTracking.nsaidUsage || medicationTracking.antibioticUsage) {
      // Check if we already have a tracking record
      const existingTracking = medications.find(med => med.name === 'Medication Tracking')
      
      const trackingData = {
        id: existingTracking?.id || `tracking-${Date.now()}`,
        name: 'Medication Tracking',
        dosage: '',
        timeOfDay: 'custom',
        customTime: '',
        remindersEnabled: false,
        notes: 'Medication adherence tracking data',
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        missed_medications_list: medicationTracking.missedMedications ? medicationTracking.missedMedicationsList.filter(item => item.medication.trim()) : [],
        nsaid_list: medicationTracking.nsaidUsage ? medicationTracking.nsaidList.filter(item => item.details.trim()) : [],
        antibiotic_list: medicationTracking.antibioticUsage ? medicationTracking.antibioticList.filter(item => item.details.trim()) : [],
        createdAt: existingTracking?.createdAt || new Date().toISOString()
      }

      if (existingTracking) {
        // Update existing tracking record
        setMedications(prevMedications => prevMedications.map(med => 
          med.id === existingTracking.id ? trackingData : med
        ))
      } else {
        // Add new tracking record
        setMedications(prevMedications => [trackingData, ...prevMedications])
      }
    }
  }, [medicationTracking])


  // Update global reminder service when medications change
  useEffect(() => {
    reminderService.updateMedications(medications)
  }, [medications])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Medications</h1>
            <p className="text-gray-600 font-roboto">
              Manage your medication schedule and track adherence. Set up reminders to help you stay on track.
            </p>
          </div>
          <div className="sm:ml-4">
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

      {/* Add/Edit Medication Form */}
      {isAdding && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">
            {editingId ? 'Edit Medication' : 'Add New Medication'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Mesalamine, Prednisone"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="dosage" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                  Dosage
                </label>
                <input
                  type="text"
                  id="dosage"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  placeholder="e.g., 500mg, 2 tablets"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                  Reminder Time
                </label>
                <TimePicker
                  value={formData.timeOfDay}
                  onChange={(value) => setFormData(prev => ({ ...prev, timeOfDay: value }))}
                />
              </div>

              {formData.timeOfDay === 'custom' && (
                <div>
                  <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                    Custom Time
                  </label>
                  <TimePicker
                    value={formData.customTime}
                    onChange={(value) => setFormData(prev => ({ ...prev, customTime: value }))}
                  />
                </div>
              )}
            </div>

            <div className="flex items-start sm:items-center">
               <input
                 type="checkbox"
                 id="remindersEnabled"
                 name="remindersEnabled"
                 checked={formData.remindersEnabled}
                 onChange={handleInputChange}
                 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded accent-blue-600"
               />
              <label htmlFor="remindersEnabled" className="ml-2 block text-sm font-roboto text-gray-700">
                Enable reminder notifications for this medication
              </label>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions, side effects to watch for, etc."
                className="input-field resize-none"
              />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="btn-primary font-roboto">
                {editingId ? 'Update Medication' : 'Add Medication'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary font-roboto">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Medications List */}
      <div className="card mt-8 sm:mt-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4 sm:mb-0">Your Medications</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn-primary font-roboto whitespace-nowrap"
            >
              Add Medication
            </button>
          )}
        </div>

        {medications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="font-roboto">No medications added yet. Add your first medication to get started!</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {medications.map((medication) => (
              <div key={medication.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold font-source text-gray-900 mb-1">
                      {medication.name}
                    </h3>
                    {medication.dosage && (
                      <p className="text-sm text-gray-600 mb-2 font-roboto">
                        <span className="font-medium">Dosage:</span> {medication.dosage}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium font-roboto ${getTimeOfDayColor(medication.timeOfDay)}`}>
                        {getTimeOfDayLabel(medication)}
                      </span>
                      {medication.remindersEnabled !== false && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-roboto bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Reminders On
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => startEdit(medication)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="Edit medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(medication.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {medication.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-700 font-roboto">
                      <span className="font-medium">Notes:</span> {medication.notes}
                    </p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 font-roboto">
                  Added {formatUKDate(medication.createdAt)}
                  {medication.updatedAt && medication.updatedAt !== medication.createdAt && (
                    <span> • Updated {formatUKDate(medication.updatedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medication Tracking */}
      <div className="card mt-8">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Medication Tracking</h2>
        
        {/* Missed Medications */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Did you miss any prescribed medications recently?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="missedMedications"
                  value="true"
                  checked={medicationTracking.missedMedications === true}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="missedMedications"
                  value="false"
                  checked={medicationTracking.missedMedications === false}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {medicationTracking.missedMedications && (
            <div className="ml-0 md:ml-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  Which medications did you miss?
                </h4>
                <button
                  type="button"
                  onClick={addMissedMedication}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add Medication
                </button>
              </div>
              
              {medicationTracking.missedMedicationsList.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {medicationTracking.missedMedicationsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMissedMedication(index)}
                      className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                      title="Remove medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., Mesalamine, Prednisone"
                        value={item.medication}
                        onChange={(e) => updateMissedMedication(index, 'medication', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <DatePicker
                        value={item.date || new Date().toISOString().split('T')[0]}
                        onChange={(value) => updateMissedMedication(index, 'date', value)}
                        placeholder="Date"
                        className="w-full"
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateMissedMedication(index, 'timeOfDay', e.target.value)}
                        className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:border-gray-300"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                        required
                      >
                        <option value="">Time of day</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NSAID Usage */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Did you take any NSAIDs (ibuprofen, naproxen, aspirin) recently?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="true"
                  checked={medicationTracking.nsaidUsage === true}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="false"
                  checked={medicationTracking.nsaidUsage === false}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>
          
          {medicationTracking.nsaidUsage && (
            <div className="ml-0 md:ml-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  Which NSAIDs did you take?
                </h4>
                <button
                  type="button"
                  onClick={addNsaid}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add NSAID
                </button>
              </div>
              
              {medicationTracking.nsaidList.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {medicationTracking.nsaidList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNsaid(index)}
                      className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                      title="Remove NSAID"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., Ibuprofen 200mg"
                        value={item.details}
                        onChange={(e) => updateNsaid(index, 'details', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <DatePicker
                        value={item.date || new Date().toISOString().split('T')[0]}
                        onChange={(value) => updateNsaid(index, 'date', value)}
                        placeholder="When taken?"
                        className="w-full"
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateNsaid(index, 'timeOfDay', e.target.value)}
                        className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:border-gray-300"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                        required
                      >
                        <option value="">Time of day</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Antibiotic Usage */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Did you take any antibiotics recently?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="true"
                  checked={medicationTracking.antibioticUsage === true}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="false"
                  checked={medicationTracking.antibioticUsage === false}
                  onChange={handleMedicationTrackingChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>
          
          {medicationTracking.antibioticUsage && (
            <div className="ml-0 md:ml-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  Which antibiotics did you take?
                </h4>
                <button
                  type="button"
                  onClick={addAntibiotic}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add Antibiotic
                </button>
              </div>
              
              {medicationTracking.antibioticList.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {medicationTracking.antibioticList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAntibiotic(index)}
                      className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                      title="Remove antibiotic"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., Amoxicillin 500mg"
                        value={item.details}
                        onChange={(e) => updateAntibiotic(index, 'details', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <DatePicker
                        value={item.date || new Date().toISOString().split('T')[0]}
                        onChange={(value) => updateAntibiotic(index, 'date', value)}
                        placeholder="When taken?"
                        className="w-full"
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateAntibiotic(index, 'timeOfDay', e.target.value)}
                        className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:border-gray-300"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                        required
                      >
                        <option value="">Time of day</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reminder Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium font-source text-blue-900 mb-1">Medication Reminders</h3>
            <p className="text-sm text-blue-700 mb-2 font-roboto">
              FlareCare will send browser notifications when it's time to take your medications.
            </p>
            <p className="text-xs text-blue-600 font-roboto">
              💡 <strong>Tip:</strong> Reminders only work in your web browser. 
                  They won't show up as push notifications on your phone. 
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
