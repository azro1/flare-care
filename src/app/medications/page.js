'use client'

import { useState, useEffect } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import reminderService from '@/lib/reminderService'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeMedicationName, sanitizeNotes } from '@/lib/sanitize'
import { Pill, ChevronDown } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import Masonry from 'react-masonry-css'

function MedicationsPageContent() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [expandedMedications, setExpandedMedications] = useState(new Set())
  const [takenMedications, setTakenMedications] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    timeOfDay: '',
    remindersEnabled: false,
    notes: ''
  })


  // Generate all time options from 00:00 to 23:59
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) { // 15-minute intervals
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push({ value: timeString, label: timeString })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter a medication name.')
      return
    }

    try {
      if (editingId) {
        // Update existing medication
        const updatedMedication = {
          name: sanitizeMedicationName(formData.name),
          dosage: formData.dosage,
          time_of_day: formData.timeOfDay,
          reminders_enabled: formData.remindersEnabled,
          notes: sanitizeNotes(formData.notes)
        }

        const { error } = await supabase
          .from(TABLES.MEDICATIONS)
          .update(updatedMedication)
          .eq('id', parseInt(editingId))
          .eq('user_id', user?.id)

        if (error) throw error

        // Get the old medication name before updating
        const oldMedication = medications.find(med => med.id === editingId)
        const newMedicationName = sanitizeMedicationName(formData.name)
        
        // Update local state
        const updatedMedications = medications.map(med => 
          med.id === editingId 
            ? { ...med, ...formData, name: newMedicationName, notes: sanitizeNotes(formData.notes), updatedAt: new Date().toISOString() }
            : med
        )
        setMedications(updatedMedications)
        
        // Also save to localStorage for reports
        localStorage.setItem('flarecare-medications', JSON.stringify(updatedMedications))
        
        // Update Recent Activity if medication name changed
        if (oldMedication && oldMedication.name !== newMedicationName) {
          const today = new Date().toISOString().split('T')[0]
          
          // Store medication updated activity
          const updatedKey = `flarecare-medication-updated-${user?.id}-${today}`
          localStorage.setItem(updatedKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            oldMedicationName: oldMedication.name,
            newMedicationName: newMedicationName
          }))
          
          // Update individual medication takings if name changed
          const individualTakingsKey = `flarecare-medication-individual-takings-${user?.id}-${today}`
          const individualTakingsData = localStorage.getItem(individualTakingsKey)
          if (individualTakingsData) {
            try {
              const takings = JSON.parse(individualTakingsData)
              const updatedTakings = takings.map(taking => 
                taking.medicationId === editingId 
                  ? { ...taking, medicationName: newMedicationName }
                  : taking
              )
              localStorage.setItem(individualTakingsKey, JSON.stringify(updatedTakings))
            } catch (error) {
              console.error('Error updating individual medication takings:', error)
            }
          }
          
          // Dispatch custom event to notify dashboard
          window.dispatchEvent(new Event('medication-updated'))
        }
        
        setEditingId(null)
      } else {
        // Add new medication
        const newMedication = {
          user_id: user?.id,
          name: sanitizeMedicationName(formData.name),
          dosage: formData.dosage,
          time_of_day: formData.timeOfDay,
          reminders_enabled: formData.remindersEnabled,
          notes: sanitizeNotes(formData.notes)
        }

        // Save to Supabase
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .insert([newMedication])
          .select()

        if (error) throw error

        // Update local state (map back to camelCase for local use)
        const insertedMed = data[0]
        const localMedication = {
          id: insertedMed.id.toString(),
          name: insertedMed.name,
          dosage: insertedMed.dosage || '',
          timeOfDay: insertedMed.time_of_day || '',
          remindersEnabled: insertedMed.reminders_enabled !== false,
          notes: insertedMed.notes || '',
          createdAt: insertedMed.created_at,
          updatedAt: insertedMed.updated_at
        }
        const updatedMedications = [localMedication, ...medications]
        setMedications(updatedMedications)
        
        // Also save to localStorage for reports
        localStorage.setItem('flarecare-medications', JSON.stringify(updatedMedications))
        
        // Store timestamp for Recent Activity on dashboard
        const today = new Date().toISOString().split('T')[0]
        const activityKey = `flarecare-medication-added-${user?.id}-${today}`
        localStorage.setItem(activityKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          medicationName: insertedMed.name
        }))
        
        // Dispatch custom event to notify dashboard
        window.dispatchEvent(new Event('medication-added'))
      }

      setFormData({
        name: '',
        dosage: '',
        timeOfDay: '7:00',
        remindersEnabled: true,
        notes: ''
      })
      setIsAdding(false)
    } catch (error) {
      console.error('Error saving medication:', error)
      alert('Failed to save medication. Please try again.')
    }
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
      timeOfDay: medication.timeOfDay ?? '',
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
      remindersEnabled: false,
      notes: ''
    })
    setEditingId(null)
    setIsAdding(false)
  }

  // Fetch medications from Supabase on load
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Transform to camelCase for local use
        const transformedMedications = data.map(med => ({
          id: med.id.toString(),
          name: med.name,
          dosage: med.dosage || '',
          timeOfDay: med.time_of_day || '',
          remindersEnabled: med.reminders_enabled !== false,
          notes: med.notes || '',
          createdAt: med.created_at,
          updatedAt: med.updated_at
        }))

        setMedications(transformedMedications)
        
        // Also save to localStorage for reports
        localStorage.setItem('flarecare-medications', JSON.stringify(transformedMedications))
      } catch (error) {
        console.error('Error fetching medications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMedications()
  }, [user?.id])

  // Load today's taken medications from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const storageKey = `flarecare-medications-taken-${today}`
    
    // Clean up old entries (keep only today's)
    const cleanupOldEntries = () => {
      const keysToRemove = []
      const timestampKey = `flarecare-medications-completed-${today}`
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          (key.startsWith('flarecare-medications-taken-') && key !== storageKey) ||
          (key.startsWith('flarecare-medications-completed-') && key !== timestampKey)
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    // Clean up on mount
    cleanupOldEntries()
    
    // Load today's data
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setTakenMedications(JSON.parse(stored))
      } catch (error) {
        console.error('Error parsing taken medications:', error)
        setTakenMedications([])
      }
    } else {
      setTakenMedications([])
    }
  }, [])

  // Update global reminder service when medications change
  useEffect(() => {
    console.log('=== MEDICATIONS CHANGED ===')
    console.log('Medications array:', medications)
    medications.forEach((med, index) => {
      console.log(`Medication ${index}:`, {
        name: med.name,
        timeOfDay: med.timeOfDay,
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

  const toggleMedicationExpand = (id) => {
    setExpandedMedications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const confirmDelete = async () => {
    if (!deleteModal.id || !user?.id) return

    try {
      // Get medication info before deleting
      const medicationToDelete = medications.find(med => med.id === deleteModal.id)
      const medicationName = medicationToDelete?.name

      const { error } = await supabase
        .from(TABLES.MEDICATIONS)
        .delete()
        .eq('id', parseInt(deleteModal.id))
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      const updatedMedications = medications.filter(med => med.id !== deleteModal.id)
      setMedications(updatedMedications)
      
      // Also update localStorage for reports
      localStorage.setItem('flarecare-medications', JSON.stringify(updatedMedications))
      
      // Store deletion activity for Recent Activity
      if (medicationName) {
        const today = new Date().toISOString().split('T')[0]
        const deletedKey = `flarecare-medication-deleted-${user?.id}-${today}`
        localStorage.setItem(deletedKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          medicationName: medicationName
        }))
        
        // Remove from taken medications list
        const storageKey = `flarecare-medications-taken-${today}`
        const takenData = localStorage.getItem(storageKey)
        if (takenData) {
          try {
            const taken = JSON.parse(takenData)
            const filteredTaken = taken.filter(id => id !== deleteModal.id)
            localStorage.setItem(storageKey, JSON.stringify(filteredTaken))
            
            // Check if we need to remove the completion timestamp
            const timestampKey = `flarecare-medications-completed-${today}`
            const prescribedMedications = updatedMedications.filter(med => med.name !== 'Medication Tracking')
            if (filteredTaken.length !== prescribedMedications.length) {
              localStorage.removeItem(timestampKey)
            }
          } catch (error) {
            console.error('Error removing from taken medications:', error)
          }
        }
        
        // Dispatch custom event to notify dashboard
        window.dispatchEvent(new Event('medication-deleted'))
      }
      
      setDeleteModal({ isOpen: false, id: null })
    } catch (error) {
      console.error('Error deleting medication:', error)
      alert('Failed to delete medication. Please try again.')
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
      'as-needed': 'bg-gray-100 text-gray-800'
    }
    return colors[timeOfDay] || 'bg-gray-100 text-gray-800'
  }

  const getTimeOfDayLabel = (medication) => {
    const option = timeOptions.find(opt => opt.value === medication.timeOfDay)
    if (option) return option.label
    // If it's a time string (HH:mm format), format it nicely
    if (medication.timeOfDay && medication.timeOfDay.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = medication.timeOfDay.split(':')
      const time = new Date(`2000-01-01T${hours}:${minutes}`)
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    return medication.timeOfDay || 'Not set'
  }

  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const handleMarkAsTaken = (medicationId) => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const storageKey = `flarecare-medications-taken-${today}`
    const timestampKey = `flarecare-medications-completed-${today}`
    const individualTakingsKey = `flarecare-medication-individual-takings-${user?.id}-${today}`
    
    // Filter out "Medication Tracking" entries (same as dashboard does)
    const prescribedMedications = medications.filter(med => med.name !== 'Medication Tracking')
    const medication = medications.find(med => med.id === medicationId)
    
    // Check if already taken today
    if (takenMedications.includes(medicationId)) {
      // Remove from taken list
      const updated = takenMedications.filter(id => id !== medicationId)
      setTakenMedications(updated)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      // Remove timestamp if not all medications are taken
      if (updated.length !== prescribedMedications.length) {
        localStorage.removeItem(timestampKey)
      }
      
      // Remove from individual takings
      const individualTakings = JSON.parse(localStorage.getItem(individualTakingsKey) || '[]')
      const updatedTakings = individualTakings.filter(taking => taking.medicationId !== medicationId)
      localStorage.setItem(individualTakingsKey, JSON.stringify(updatedTakings))
    } else {
      // Add to taken list
      const updated = [...takenMedications, medicationId]
      setTakenMedications(updated)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      
      // Store individual medication taking
      if (medication) {
        const individualTakings = JSON.parse(localStorage.getItem(individualTakingsKey) || '[]')
        // Remove any existing entry for this medication (in case they're re-marking it)
        const filteredTakings = individualTakings.filter(taking => taking.medicationId !== medicationId)
        // Add new entry
        filteredTakings.push({
          medicationId: medicationId,
          medicationName: medication.name,
          timestamp: new Date().toISOString()
        })
        localStorage.setItem(individualTakingsKey, JSON.stringify(filteredTakings))
      }
      
      // If all medications are now taken, store timestamp
      if (updated.length === prescribedMedications.length && prescribedMedications.length > 0) {
        localStorage.setItem(timestampKey, new Date().toISOString())
      }
    }
    
    // Dispatch custom event to notify other components (like dashboard)
    window.dispatchEvent(new Event('medication-taken'))
  }

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      {/* Header Section */}
      <div className="mb-4 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">
                My Medications
              </h1>
              <p className="text-secondary font-roboto">
                Add your prescribed medications, set up reminders, and keep track of your medication schedule
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Medications Section */}
      <div className="card mb-4 sm:mb-6 min-w-0">
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isAdding || medications.length > 0 ? 'mb-5 sm:mb-6' : 'mb-0'} `}>
          <div className="flex items-center">
            <div className="flex w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-xl items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              {isAdding ? (
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <Pill className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold font-source text-primary">
              {isAdding ? (editingId ? 'Edit Medication' : 'Add New Medication') : 'Medications'}
            </h2>
          </div>
          {!isAdding && (
            <button
              onClick={startAdding}
              className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors self-start sm:self-auto"
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
          <div className="mb-6 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
                    autoComplete="off"
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
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label className="block text-base font-semibold font-roboto text-primary mb-3">
                    Reminder Time
                  </label>
                  <select
                    value={formData.timeOfDay || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, timeOfDay: e.target.value || '' }))
                    }}
                    className={`input-field-wizard ${formData.timeOfDay ? 'has-value' : 'placeholder'}`}
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

              <div className="flex items-start sm:items-center card-inner p-4">
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
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  type="submit" 
                  className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingId ? 'Update' : 'Add Medication'}
                </button>
                <button 
                  type="button" 
                  onClick={cancelEdit} 
                  className="px-4 py-2 text-lg font-semibold rounded-lg transition-colors hover:opacity-80"
                  style={{ 
                    backgroundColor: 'var(--bg-button-cancel)', 
                    color: 'var(--text-primary)'
                  }}
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

        {isLoading ? (
          <div className="text-center py-12 text-secondary">
            <p className="font-roboto">Loading medications...</p>
          </div>
        ) : medications.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <div className="card-inner rounded-full w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
              <Pill className="w-6 h-6 sm:w-10 sm:h-10 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold font-source text-primary mb-2">No medications added yet</h3>
            <p className="font-roboto text-secondary max-w-md mx-auto">Add your medications to keep track of them and set up reminders to help you stay on schedule.</p>
          </div>
        ) : (
          <Masonry
            breakpointCols={{
              default: 2,
              1024: 2,
              640: 1
            }}
            className="flex -ml-6 w-auto min-w-0"
            columnClassName="pl-6 bg-clip-padding"
          >
            {medications.map((medication) => {
              const isExpanded = expandedMedications.has(medication.id)
              return (
                <div key={medication.id}>
                  <div className="card-inner p-4 sm:p-6 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className={`flex items-center gap-2 ${isExpanded ? 'mb-1' : ''} min-w-0`}>
                        <h3 className="text-lg font-semibold font-source text-primary break-words sm:truncate min-w-0 flex-1">
                          {medication.name}
                        </h3>
                        <button
                          onClick={() => toggleMedicationExpand(medication.id)}
                          className="flex-shrink-0 p-1 rounded transition-colors hover:bg-opacity-20"
                          style={{ color: 'var(--text-icon)' }}
                          title={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          <ChevronDown 
                            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      {isExpanded && (
                        <>
                          {medication.dosage && (
                            <p className="text-base text-secondary mb-3 font-roboto break-words">
                              <span className="font-semibold">Dosage:</span> {medication.dosage}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            {medication.timeOfDay && (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium font-roboto ${getTimeOfDayColor(medication.timeOfDay)}`}>
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {getTimeOfDayLabel(medication)}
                              </span>
                            )}
                            {medication.remindersEnabled !== false && (
                              <span 
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium font-roboto"
                                style={{ 
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-cadet-blue)'
                                }}
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Reminders On</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <button
                              onClick={() => handleMarkAsTaken(medication.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center justify-center"
                              style={{
                                border: '1px solid',
                                borderColor: 'var(--border-card-inner)',
                                ...(takenMedications.includes(medication.id) 
                                  ? {
                                      backgroundColor: 'var(--bg-button-cadet)',
                                      color: 'white'
                                    }
                                  : {
                                      color: 'var(--text-primary)',
                                      backgroundColor: 'transparent'
                                    }
                                ),
                                minWidth: '140px'
                              }}
                              title={takenMedications.includes(medication.id) ? "Mark as not taken" : "Mark as taken"}
                            >
                              {takenMedications.includes(medication.id) ? (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Taken</span>
                                </>
                              ) : (
                                <span>Mark as Taken</span>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => startEdit(medication)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{ 
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-icon)'
                        }}
                        title="Edit medication"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteMedication(medication.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{ 
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-icon)'
                        }}
                        title="Delete medication"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && medication.notes && (
                    <div className="mt-4 pt-4 min-w-0" style={{ borderTop: '1px solid', borderColor: 'var(--border-card-inner)' }}>
                      <div className="card-inner p-3 min-w-0">
                        <p className="text-sm text-secondary font-roboto break-words">
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
                      Added {medication.createdAt ? formatUKDate(medication.createdAt) : '—'}
                    </div>
                  </div>
                  </div>
                </div>
              )
            })}
          </Masonry>
        )}
      </div>


      {/* Reminder Info */}
      <div className="mt-4 sm:mt-6 card">
        <div>
          <h3 className="text-xl sm:text-lg font-semibold font-source text-primary mb-2 flex items-center space-x-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Medication Reminders</span>
          </h3>
          <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
            FlareCare will send browser notifications when it's time to take your medications
          </p>
          <div className="card-inner p-6 mt-4">
            <div className="flex items-center space-x-1">
              <span className="text-lg">💡</span>
              <p className="text-base sm:text-sm font-medium text-primary mb-2 font-roboto">Important to know:</p>
            </div>
            <p className="text-sm  text-secondary font-roboto leading-relaxed">
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
