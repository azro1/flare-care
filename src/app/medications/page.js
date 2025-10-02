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
    nsaidList: [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }],
    antibioticUsage: false,
    antibioticList: [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
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
      // Check if we're deleting the medication tracking data
      const medicationToDelete = medications.find(med => med.id === deleteModal.id)
      if (medicationToDelete?.name === 'Medication Tracking') {
        // Reset tracking state when deleting tracking data
        setMedicationTracking({
          missedMedications: false,
          missedMedicationsList: [{ medication: '', timeOfDay: '', date: new Date().toISOString().split('T')[0] }],
          nsaidUsage: false,
          nsaidList: [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }],
          antibioticUsage: false,
          antibioticList: [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
        })
      }
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
      nsaidList: [...prev.nsaidList, { medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
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
      antibioticList: [...prev.antibioticList, { medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
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
    const isTrue = type === 'checkbox' ? checked : value === 'true'
    
    setMedicationTracking(prev => {
      const newState = {
        ...prev,
        [name]: isTrue
      }
      
      // When setting to true, load existing data from medications array or initialize with empty entry
      if (name === 'missedMedications' && isTrue) {
        const existingTracking = medications.find(med => med.name === 'Medication Tracking')
        if (existingTracking?.missed_medications_list && existingTracking.missed_medications_list.length > 0) {
          newState.missedMedicationsList = existingTracking.missed_medications_list
        } else if (prev.missedMedicationsList.length === 0) {
          newState.missedMedicationsList = [{ medication: '', timeOfDay: '', date: new Date().toISOString().split('T')[0] }]
        }
      }
      if (name === 'nsaidUsage' && isTrue) {
        const existingTracking = medications.find(med => med.name === 'Medication Tracking')
        if (existingTracking?.nsaid_list && existingTracking.nsaid_list.length > 0) {
          newState.nsaidList = existingTracking.nsaid_list
        } else if (prev.nsaidList.length === 0) {
          newState.nsaidList = [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
        }
      }
      if (name === 'antibioticUsage' && isTrue) {
        const existingTracking = medications.find(med => med.name === 'Medication Tracking')
        if (existingTracking?.antibiotic_list && existingTracking.antibiotic_list.length > 0) {
          newState.antibioticList = existingTracking.antibiotic_list
        } else if (prev.antibioticList.length === 0) {
          newState.antibioticList = [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
        }
      }
      
      return newState
    })
  }

  // Auto-save medication tracking to medications list when data changes
  useEffect(() => {
    // Always run this effect to preserve data even when all options are false
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
        missed_medications_list: medicationTracking.missedMedications ? medicationTracking.missedMedicationsList.filter(item => item.medication.trim()) : (existingTracking?.missed_medications_list || []),
        nsaid_list: medicationTracking.nsaidUsage ? medicationTracking.nsaidList.filter(item => item.medication.trim()) : (existingTracking?.nsaid_list || []),
        antibiotic_list: medicationTracking.antibioticUsage ? medicationTracking.antibioticList.filter(item => item.medication.trim()) : (existingTracking?.antibiotic_list || []),
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
  }, [medicationTracking.missedMedications, medicationTracking.missedMedicationsList, medicationTracking.nsaidUsage, medicationTracking.nsaidList, medicationTracking.antibioticUsage, medicationTracking.antibioticList])

  // Preserve existing tracking data when all options are set to false
  useEffect(() => {
    const existingTracking = medications.find(med => med.name === 'Medication Tracking')
    
    // If we have existing tracking data but all options are false, preserve the data
    if (existingTracking && !medicationTracking.missedMedications && !medicationTracking.nsaidUsage && !medicationTracking.antibioticUsage) {
      const hasExistingData = (existingTracking.missed_medications_list && existingTracking.missed_medications_list.length > 0) ||
                             (existingTracking.nsaid_list && existingTracking.nsaid_list.length > 0) ||
                             (existingTracking.antibiotic_list && existingTracking.antibiotic_list.length > 0)
      
      if (hasExistingData) {
        const trackingData = {
          ...existingTracking,
          missed_medications_list: existingTracking.missed_medications_list || [],
          nsaid_list: existingTracking.nsaid_list || [],
          antibiotic_list: existingTracking.antibiotic_list || []
        }
        
        setMedications(prevMedications => prevMedications.map(med => 
          med.id === existingTracking.id ? trackingData : med
        ))
      }
    }
  }, [medicationTracking.missedMedications, medicationTracking.nsaidUsage, medicationTracking.antibioticUsage])

  // Update global reminder service when medications change
  useEffect(() => {
    reminderService.updateMedications(medications)
  }, [medications])

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 min-w-0">
      {/* Header Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-3 sm:mb-4">
              Manage Your Medications
            </h1>
            <p className="text-gray-600 font-roboto">
              Track your medication schedule, set reminders, and monitor adherence to stay on top of your health.
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


      {/* Medication Tracking Section */}
      <div data-tracking-section className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 min-w-0">
        <div className="flex items-center mb-6 sm:mb-8">
          <div className="hidden sm:flex bg-blue-600 p-3 rounded-2xl mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold font-source text-gray-900">Medication Tracking</h2>
        </div>
                
        {/* Missed Medications */}
        <div className="mb-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold font-roboto text-gray-900">
                Did you miss any prescribed medications recently?
              </label>
            </div>
            <div className="flex space-x-2 sm:space-x-4 md:space-x-6">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="missedMedications"
                  value="false"
                  checked={!medicationTracking.missedMedications}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-red-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">No</span>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="missedMedications"
                  value="true"
                  checked={medicationTracking.missedMedications}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-red-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">Yes</span>
              </label>
            </div>

            {medicationTracking.missedMedications && (
              <div className="ml-0 md:ml-6 mt-4 min-w-0">
                <div className="space-y-4 min-w-0">
                  {medicationTracking.missedMedicationsList.map((item, index) => (
                    <div key={index} className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => removeMissedMedication(index)}
                        className="absolute -left-1 -top-1 bg-white border border-gray-300 rounded-full p-1 shadow-md z-10 text-red-500 hover:text-red-700 hover:shadow-lg transition-all duration-200 flex-shrink-0"
                        title="Remove medication"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                        <div>
                          <input
                            type="text"
                            placeholder="Medication name"
                            value={item.medication}
                            onChange={(e) => updateMissedMedication(index, 'medication', e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          />
                        </div>
                        <div>
                          <DatePicker
                            value={item.date || new Date().toISOString().split('T')[0]}
                            onChange={(value) => updateMissedMedication(index, 'date', value)}
                            placeholder="Date"
                            className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.75rem center',
                              backgroundSize: '1.5em 1.5em'
                            }}
                            maxDate={new Date().toISOString().split('T')[0]}
                            minDate={new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <select
                          value={item.timeOfDay}
                          onChange={(e) => updateMissedMedication(index, 'timeOfDay', e.target.value)}
                          className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:shadow-md"
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
                  ))}
                  <button
                    type="button"
                    onClick={addMissedMedication}
                    disabled={medicationTracking.missedMedicationsList.length > 0 && (medicationTracking.missedMedicationsList[medicationTracking.missedMedicationsList.length - 1]?.medication === '' || medicationTracking.missedMedicationsList[medicationTracking.missedMedicationsList.length - 1]?.timeOfDay === '')}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex-shrink-0 ${
                      medicationTracking.missedMedicationsList.length > 0 && (medicationTracking.missedMedicationsList[medicationTracking.missedMedicationsList.length - 1]?.medication === '' || medicationTracking.missedMedicationsList[medicationTracking.missedMedicationsList.length - 1]?.timeOfDay === '')
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:shadow-md'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Medication
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NSAID Usage */}
        <div className="mb-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold font-roboto text-gray-900">
                Did you take any NSAIDs (ibuprofen, naproxen, aspirin) recently?
              </label>
            </div>
            <div className="flex space-x-2 sm:space-x-4 md:space-x-6">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="false"
                  checked={!medicationTracking.nsaidUsage}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-orange-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">No</span>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="true"
                  checked={medicationTracking.nsaidUsage}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-orange-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">Yes</span>
              </label>
            </div>

            {medicationTracking.nsaidUsage && (
              <div className="ml-0 md:ml-6 mt-4 min-w-0">
                <div className="space-y-4 min-w-0">
                  {medicationTracking.nsaidList.map((item, index) => (
                    <div key={index} className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => removeNsaid(index)}
                        className="absolute -left-1 -top-1 bg-white border border-gray-300 rounded-full p-1 shadow-md z-10 text-red-500 hover:text-red-700 hover:shadow-lg transition-all duration-200 flex-shrink-0"
                        title="Remove NSAID"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                        <div>
                          <input
                            type="text"
                            placeholder="e.g., Ibuprofen"
                            value={item.medication}
                            onChange={(e) => updateNsaid(index, 'medication', e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          />
                        </div>
                        <div>
                          <DatePicker
                            value={item.date || new Date().toISOString().split('T')[0]}
                            onChange={(value) => updateNsaid(index, 'date', value)}
                            placeholder="When taken?"
                            className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.75rem center',
                              backgroundSize: '1.5em 1.5em'
                            }}
                            maxDate={new Date().toISOString().split('T')[0]}
                            minDate={new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <select
                          value={item.timeOfDay}
                          onChange={(e) => updateNsaid(index, 'timeOfDay', e.target.value)}
                          className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:shadow-md"
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
                  ))}
                  <button
                    type="button"
                    onClick={addNsaid}
                    className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md flex-shrink-0"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Medication
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Antibiotic Usage */}
        <div className="mb-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold font-roboto text-gray-900">
                Did you take any antibiotics recently?
              </label>
            </div>
            <div className="flex space-x-2 sm:space-x-4 md:space-x-6">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="false"
                  checked={!medicationTracking.antibioticUsage}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-green-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">No</span>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="true"
                  checked={medicationTracking.antibioticUsage}
                  onChange={handleMedicationTrackingChange}
                  className="w-5 h-5 text-green-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none group-hover:text-gray-900"
                />
                <span className="ml-3 text-sm font-roboto text-gray-700 group-hover:text-gray-900">Yes</span>
              </label>
            </div>

            {medicationTracking.antibioticUsage && (
              <div className="ml-0 md:ml-6 mt-4 min-w-0">
                <div className="space-y-4 min-w-0">
                  {medicationTracking.antibioticList.map((item, index) => (
                    <div key={index} className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => removeAntibiotic(index)}
                        className="absolute -left-1 -top-1 bg-white border border-gray-300 rounded-full p-1 shadow-md z-10 text-red-500 hover:text-red-700 hover:shadow-lg transition-all duration-200 flex-shrink-0"
                        title="Remove antibiotic"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                        <div>
                          <input
                            type="text"
                            placeholder="e.g., Amoxicillin"
                            value={item.medication}
                            onChange={(e) => updateAntibiotic(index, 'medication', e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          />
                        </div>
                        <div>
                          <DatePicker
                            value={item.date || new Date().toISOString().split('T')[0]}
                            onChange={(value) => updateAntibiotic(index, 'date', value)}
                            placeholder="When taken?"
                            className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.75rem center',
                              backgroundSize: '1.5em 1.5em'
                            }}
                            maxDate={new Date().toISOString().split('T')[0]}
                            minDate={new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <select
                          value={item.timeOfDay}
                          onChange={(e) => updateAntibiotic(index, 'timeOfDay', e.target.value)}
                          className="w-full px-4 py-3 text-left bg-white/80 border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:shadow-md"
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
                  ))}
                  <button
                    type="button"
                    onClick={addAntibiotic}
                    className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md flex-shrink-0"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Medication
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Medication Tracking Data Display */}
        {medications.find(med => med.name === 'Medication Tracking') && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h4 className="text-lg font-bold font-source text-gray-900">Tracking Data Summary</h4>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const trackingData = medications.find(med => med.name === 'Medication Tracking')
                    
                    // Set all tracking options to true and initialize lists for editing
                    const newTrackingState = {
                      missedMedications: true,
                      missedMedicationsList: trackingData.missed_medications_list?.length > 0 ? trackingData.missed_medications_list : [{ medication: '', timeOfDay: '', date: new Date().toISOString().split('T')[0] }],
                      nsaidUsage: true,
                      nsaidList: trackingData.nsaid_list?.length > 0 ? trackingData.nsaid_list : [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }],
                      antibioticUsage: true,
                      antibioticList: trackingData.antibiotic_list?.length > 0 ? trackingData.antibiotic_list : [{ medication: '', date: new Date().toISOString().split('T')[0], timeOfDay: '' }]
                    }
                    
                    setMedicationTracking(newTrackingState)
                  }}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Edit tracking data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setDeleteModal({ isOpen: true, id: medications.find(med => med.name === 'Medication Tracking')?.id })
                  }}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Delete tracking data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              {(() => {
                const trackingData = medications.find(med => med.name === 'Medication Tracking')
                return (
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-roboto text-gray-600">
                        <span className="font-semibold text-gray-700">Created:</span> {formatUKDate(trackingData.createdAt)}
                      </span>
                    </div>
                    {trackingData.missed_medications_list?.length > 0 && (
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm font-roboto text-gray-600">
                          <span className="font-semibold text-gray-700">Missed:</span> {trackingData.missed_medications_list.length} entries
                        </span>
                      </div>
                    )}
                    {trackingData.nsaid_list?.length > 0 && (
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm font-roboto text-gray-600">
                          <span className="font-semibold text-gray-700">NSAIDs:</span> {trackingData.nsaid_list.length} entries
                        </span>
                      </div>
                    )}
                    {trackingData.antibiotic_list?.length > 0 && (
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm font-roboto text-gray-600">
                          <span className="font-semibold text-gray-700">Antibiotics:</span> {trackingData.antibiotic_list.length} entries
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Your Medications Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center">
            <div className="hidden sm:flex bg-blue-600 p-3 rounded-2xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isAdding ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                )}
              </svg>
            </div>
            <h2 className="text-xl font-semibold font-source text-gray-900">
              {isAdding ? (editingId ? 'Edit Medication' : 'Add New Medication') : 'Your Medications'}
            </h2>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 self-start sm:self-auto"
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
                  <label htmlFor="name" className="block text-base font-semibold font-roboto text-gray-700 mb-3">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Medication name"
                    className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dosage" className="block text-base font-semibold font-roboto text-gray-700 mb-3">
                    Dosage
                  </label>
                  <input
                    type="text"
                    id="dosage"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    placeholder="e.g., 500mg"
                    className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label className="block text-base font-semibold font-roboto text-gray-700 mb-3">
                    Reminder Time
                  </label>
                  <TimePicker
                    value={formData.timeOfDay}
                    onChange={(value) => setFormData(prev => ({ ...prev, timeOfDay: value }))}
                  />
                </div>

                {formData.timeOfDay === 'custom' && (
                  <div>
                    <label className="block text-base font-semibold font-roboto text-gray-700 mb-3">
                      Custom Time
                    </label>
                    <TimePicker
                      value={formData.customTime}
                      onChange={(value) => setFormData(prev => ({ ...prev, customTime: value }))}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start sm:items-center bg-white/60 rounded-2xl p-4">
                 <input
                   type="checkbox"
                   id="remindersEnabled"
                   name="remindersEnabled"
                   checked={formData.remindersEnabled}
                   onChange={handleInputChange}
                   className="h-5 w-5 text-blue-600 focus:ring-0 focus:outline-none border-2 border-gray-300 rounded accent-blue-600"
                 />
                <label htmlFor="remindersEnabled" className="ml-3 block text-base font-roboto text-gray-700">
                  Enable reminder notifications for this medication
                </label>
              </div>

              <div>
                <label htmlFor="notes" className="block text-base font-semibold font-roboto text-gray-700 mb-3">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions, side effects to watch for, etc."
                  className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95">
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingId ? 'Update Medication' : 'Add Medication'}
                </button>
                <button type="button" onClick={cancelEdit} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-medium font-roboto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95">
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
          <div className="text-center py-12 text-gray-500">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold font-source text-gray-700 mb-2">No medications added yet</h3>
            <p className="font-roboto text-gray-500 max-w-md mx-auto">Add your medications to keep track of them and set up reminders to help you stay on schedule.</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            {medications.filter(med => med.name !== 'Medication Tracking').map((medication) => (
              <div key={medication.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 min-w-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold font-source text-gray-900 mb-2 break-words">
                      {medication.name}
                    </h3>
                    {medication.dosage && (
                      <p className="text-base text-gray-600 mb-3 font-roboto break-words">
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
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium font-roboto bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Reminders On
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => startEdit(medication)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Edit medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(medication.id)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Delete medication"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {medication.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 font-roboto bg-gray-50 rounded-xl p-3">
                      <span className="font-semibold text-gray-700">Notes:</span> {medication.notes}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 font-roboto">
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
      <div className="mt-6 sm:mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold font-source text-blue-900 mb-1 sm:mb-2">Medication Reminders</h3>
            <p className="text-sm sm:text-base text-blue-800 mb-2 sm:mb-3 font-roboto leading-relaxed">
              FlareCare will send browser notifications when it's time to take your medications.
            </p>
            <div className="bg-blue-100/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
              <div className="flex items-start space-x-2">
                <span className="text-base sm:text-lg">💡</span>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1 font-roboto">Important to know:</p>
                  <p className="text-xs sm:text-sm text-blue-700 font-roboto leading-relaxed">
                    Reminders only work in your web browser. They won't show up as push notifications on your phone. 
                    You can turn reminders on or off for each medication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title={medications.find(med => med.id === deleteModal.id)?.name === 'Medication Tracking' ? 'Delete Tracking Data' : 'Delete Medication'}
        message={medications.find(med => med.id === deleteModal.id)?.name === 'Medication Tracking' 
          ? 'Are you sure you want to delete all medication tracking data? This action cannot be undone.' 
          : 'Are you sure you want to delete this medication? This action cannot be undone.'}
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
