'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Pill } from 'lucide-react'

function MedicationTrackingWizard() {
  const router = useRouter()
  const { user } = useAuth()

  // Wizard state - initialize from localStorage if available
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('medication-wizard-step')
      return savedStep ? parseInt(savedStep) : 0
    }
    return 0
  })

  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFormData = localStorage.getItem('medication-wizard-form')
      return savedFormData ? JSON.parse(savedFormData) : {
        missedMedications: false,
        missedMedicationsList: [{ medication: '', date: null, timeOfDay: '' }],
        nsaidUsage: false,
        nsaidList: [{ medication: '', date: null, timeOfDay: '', dosage: '' }],
        antibioticUsage: false,
        antibioticList: [{ medication: '', date: null, timeOfDay: '', dosage: '' }]
      }
    }
    return {
      missedMedications: false,
      missedMedicationsList: [{ medication: '', date: null, timeOfDay: '' }],
      nsaidUsage: false,
      nsaidList: [{ medication: '', date: null, timeOfDay: '', dosage: '' }],
      antibioticUsage: false,
      antibioticList: [{ medication: '', date: null, timeOfDay: '', dosage: '' }]
    }
  })

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [dateErrors, setDateErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medication-wizard-step', currentStep.toString())
    }
  }, [currentStep])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medication-wizard-form', JSON.stringify(formData))
    }
  }, [formData])

  // Clear localStorage when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medication-wizard-step')
        localStorage.removeItem('medication-wizard-form')
      }
    }
  }, [])

  // Prevent body scrolling only on landing page
  useEffect(() => {
    if (currentStep === 0) {
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.background = 'var(--bg-main-gradient)'
      document.documentElement.style.minHeight = '100vh'
    } else {
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.minHeight = ''
    }

    return () => {
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.minHeight = ''
    }
  }, [currentStep])

  // Smart navigation - calculate which steps should be shown
  const getVisibleSteps = () => {
    const steps = [0, 1] // Landing page and first question always shown
    
    if (formData.missedMedications) steps.push(2) // Missed meds list
    
    steps.push(3) // NSAIDs question
    if (formData.nsaidUsage) steps.push(4) // NSAIDs list
    
    steps.push(5) // Antibiotics question
    if (formData.antibioticUsage) steps.push(6) // Antibiotics list
    
    steps.push(7) // Review page
    
    return steps
  }

  const nextStep = () => {
    // Validate step 2 (missed medications list) - must have at least one complete entry if they answered yes
    if (currentStep === 2) {
      const hasCompleteEntry = formData.missedMedicationsList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay
      )
      
      if (!hasCompleteEntry) {
        setFieldErrors(prev => ({ ...prev, missedMedicationsList: 'Please enter at least one medication' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, missedMedicationsList: '' }))
    }
    
    // Validate step 4 (NSAIDs list) - must have at least one complete entry if they answered yes
    if (currentStep === 4) {
      const hasCompleteEntry = formData.nsaidList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay && item.dosage.trim()
      )
      
      if (!hasCompleteEntry) {
        setFieldErrors(prev => ({ ...prev, nsaidList: 'Please enter at least one NSAID' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, nsaidList: '' }))
    }
    
    // Validate step 6 (antibiotics list) - must have at least one complete entry if they answered yes
    if (currentStep === 6) {
      const hasCompleteEntry = formData.antibioticList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay && item.dosage.trim()
      )
      
      if (!hasCompleteEntry) {
        setFieldErrors(prev => ({ ...prev, antibioticList: 'Please enter at least one antibiotic' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, antibioticList: '' }))
    }
    
    const visibleSteps = getVisibleSteps()
    const currentIndex = visibleSteps.indexOf(currentStep)
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const visibleSteps = getVisibleSteps()
    const currentIndex = visibleSteps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1])
    }
  }

  // Handle form data changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'radio' && (value === 'true' || value === 'false') ? value === 'true' : value)
    }))
  }

  // Missed medications list handlers
  const addMissedMedication = () => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: [...prev.missedMedicationsList, { medication: '', date: null, timeOfDay: '' }]
    }))
  }

  const removeMissedMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.filter((_, i) => i !== index)
    }))
  }

  const updateMissedMedication = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        missedMedicationsList: formData.missedMedicationsList.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
      const hasCompleteEntry = newFormData.missedMedicationsList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay
      )
      if (hasCompleteEntry && fieldErrors.missedMedicationsList) {
        setFieldErrors(prev => ({ ...prev, missedMedicationsList: '' }))
      }
    }, 0)
  }

  // NSAIDs list handlers
  const addNsaid = () => {
    setFormData(prev => ({
      ...prev,
      nsaidList: [...prev.nsaidList, { medication: '', date: null, timeOfDay: '', dosage: '' }]
    }))
  }

  const removeNsaid = (index) => {
    setFormData(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.filter((_, i) => i !== index)
    }))
  }

  const updateNsaid = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        nsaidList: formData.nsaidList.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
      const hasCompleteEntry = newFormData.nsaidList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay && item.dosage.trim()
      )
      if (hasCompleteEntry && fieldErrors.nsaidList) {
        setFieldErrors(prev => ({ ...prev, nsaidList: '' }))
      }
    }, 0)
  }

  // Antibiotics list handlers
  const addAntibiotic = () => {
    setFormData(prev => ({
      ...prev,
      antibioticList: [...prev.antibioticList, { medication: '', date: null, timeOfDay: '', dosage: '' }]
    }))
  }

  const removeAntibiotic = (index) => {
    setFormData(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.filter((_, i) => i !== index)
    }))
  }

  const updateAntibiotic = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        antibioticList: formData.antibioticList.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
      const hasCompleteEntry = newFormData.antibioticList.some(item => 
        item.medication.trim() && item.date && item.timeOfDay && item.dosage.trim()
      )
      if (hasCompleteEntry && fieldErrors.antibioticList) {
        setFieldErrors(prev => ({ ...prev, antibioticList: '' }))
      }
    }, 0)
  }

  // Handle cancel
  const handlePatternModalCancel = () => {
    localStorage.removeItem('medication-wizard-step')
    localStorage.removeItem('medication-wizard-form')
    router.push('/')
  }

  // Handle submit
  const handleSubmit = async () => {
    // Filter out empty entries
    const cleanedData = {
      missedMedicationsList: formData.missedMedications ? formData.missedMedicationsList.filter(item => item.medication.trim()) : [],
      nsaidList: formData.nsaidUsage ? formData.nsaidList.filter(item => item.medication.trim()) : [],
      antibioticList: formData.antibioticUsage ? formData.antibioticList.filter(item => item.medication.trim()) : []
    }

    // Save to localStorage (or Supabase if implemented)
    const medicationData = {
      id: `medication-tracking-${Date.now()}`,
      ...cleanedData,
      createdAt: new Date().toISOString()
    }

    // Store in localStorage for now
    if (typeof window !== 'undefined') {
      const existingData = JSON.parse(localStorage.getItem('flarecare-medication-tracking') || '[]')
      existingData.push(medicationData)
      localStorage.setItem('flarecare-medication-tracking', JSON.stringify(existingData))
    }

    // Clear wizard state
    localStorage.removeItem('medication-wizard-step')
    localStorage.removeItem('medication-wizard-form')

    // Set toast flag
    localStorage.setItem('showMedicationToast', 'true')

    // Redirect to dashboard
    router.push('/')
  }

  // Render based on current step
  const renderStep = () => {
    // Step 1: Missed medications question
    if (currentStep === 1) {
      return (
        <div className="mb-5">
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Did you miss any prescribed medications recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="missedMedications"
                  value="false"
                  checked={!formData.missedMedications}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.missedMedications === false
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.missedMedications === false && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="missedMedications"
                  value="true"
                  checked={formData.missedMedications}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.missedMedications === true
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.missedMedications === true && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">Yes</span>
            </label>
          </div>
        </div>
      )
    }

    // Step 2: Missed medications list (only if yes)
    if (currentStep === 2) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <div>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">Which medications did you miss?</h3>
              </div>
              <button
                onClick={addMissedMedication}
                disabled={!formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.medication || !formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.date || !formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.timeOfDay}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  !formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.medication || !formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.date || !formData.missedMedicationsList[formData.missedMedicationsList.length - 1]?.timeOfDay
                    ? 'button-disabled'
                    : 'button-cadet'
                }`}
              >
                Add Medication
              </button>
            </div>
            <div className="space-y-4">
              {formData.missedMedicationsList.map((item, index) => (
                <div key={index} className="relative">
                  {formData.missedMedicationsList.length > 1 && (
                    <button
                      onClick={() => removeMissedMedication(index)}
                      className="absolute -right-2 -top-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200 z-10"
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="card p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={item.medication}
                        onChange={(e) => updateMissedMedication(index, 'medication', e.target.value)}
                        className="input-field-wizard w-full sm:flex-1"
                      />
                      <DatePicker
                        selected={item.date}
                        onChange={(date) => updateMissedMedication(index, 'date', date)}
                        placeholderText="Select date missed"
                        className="input-field-wizard w-full sm:flex-1"
                        dateFormat="dd/MM/yyyy"
                        maxDate={new Date()}
                        calendarClassName="react-datepicker-responsive"
                        enableTabLoop={false}
                      />
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateMissedMedication(index, 'timeOfDay', e.target.value)}
                        className={`input-field-wizard w-full sm:flex-1 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                      >
                        <option value="">Select time of day</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.missedMedicationsList && (
              <div className="mt-6 p-3 bg-red-50 dark:card-inner border border-red-300 dark:border-slate-600/50 rounded-lg">
                <p className="text-red-600 dark:text-secondary text-sm">{fieldErrors.missedMedicationsList}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Step 3: NSAIDs question
    if (currentStep === 3) {
      return (
        <div className="mb-5">
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Did you take any NSAIDs (ibuprofen, naproxen, aspirin) recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="false"
                  checked={!formData.nsaidUsage}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.nsaidUsage === false
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.nsaidUsage === false && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="true"
                  checked={formData.nsaidUsage}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.nsaidUsage === true
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.nsaidUsage === true && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">Yes</span>
            </label>
          </div>
        </div>
      )
    }

    // Step 4: NSAIDs list (only if yes)
    if (currentStep === 4) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <div>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">Which NSAIDs did you take?</h3>
              </div>
              <button
                onClick={addNsaid}
                disabled={!formData.nsaidList[formData.nsaidList.length - 1]?.medication || !formData.nsaidList[formData.nsaidList.length - 1]?.date || !formData.nsaidList[formData.nsaidList.length - 1]?.timeOfDay || !formData.nsaidList[formData.nsaidList.length - 1]?.dosage}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  !formData.nsaidList[formData.nsaidList.length - 1]?.medication || !formData.nsaidList[formData.nsaidList.length - 1]?.date || !formData.nsaidList[formData.nsaidList.length - 1]?.timeOfDay || !formData.nsaidList[formData.nsaidList.length - 1]?.dosage
                    ? 'button-disabled'
                    : 'button-cadet'
                }`}
              >
                Add Medication
              </button>
            </div>
            <div className="space-y-4">
              {formData.nsaidList.map((item, index) => (
                <div key={index} className="relative">
                  {formData.nsaidList.length > 1 && (
                    <button
                      onClick={() => removeNsaid(index)}
                      className="absolute -right-2 -top-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200 z-10"
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="card p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="e.g., Ibuprofen"
                        value={item.medication}
                        onChange={(e) => updateNsaid(index, 'medication', e.target.value)}
                        className="input-field-wizard w-full sm:flex-1"
                      />
                      <DatePicker
                        selected={item.date}
                        onChange={(date) => updateNsaid(index, 'date', date)}
                        placeholderText="Select date taken"
                        className="input-field-wizard w-full sm:flex-1"
                        dateFormat="dd/MM/yyyy"
                        maxDate={new Date()}
                        calendarClassName="react-datepicker-responsive"
                        enableTabLoop={false}
                      />
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateNsaid(index, 'timeOfDay', e.target.value)}
                        className={`input-field-wizard w-full sm:flex-1 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                      >
                        <option value="">Select time of day</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g., 200mg)"
                      value={item.dosage}
                      onChange={(e) => updateNsaid(index, 'dosage', e.target.value)}
                      className="input-field-wizard max-w-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.nsaidList && (
              <div className="mt-6 p-3 bg-red-50 dark:card-inner border border-red-300 dark:border-slate-600/50 rounded-lg">
                <p className="text-red-600 dark:text-secondary text-sm">{fieldErrors.nsaidList}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Step 5: Antibiotics question
    if (currentStep === 5) {
      return (
        <div className="mb-5">
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Did you take any antibiotics recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="false"
                  checked={!formData.antibioticUsage}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.antibioticUsage === false
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.antibioticUsage === false && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="true"
                  checked={formData.antibioticUsage}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                  style={{
                    accentColor: 'var(--text-cadet-blue)',
                    '--tw-accent-color': 'var(--text-cadet-blue)'
                  }}
                />
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.antibioticUsage === true
                    ? 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                    : 'border-[var(--radio-border)] bg-[var(--radio-bg)]'
                }`}>
                  {formData.antibioticUsage === true && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--text-cadet-blue)]"></div>
                  )}
                </span>
              </div>
              <span className="ml-3 text-lg text-secondary">Yes</span>
            </label>
          </div>
        </div>
      )
    }

    // Step 6: Antibiotics list (only if yes)
    if (currentStep === 6) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <div>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">Which antibiotics did you take?</h3>
              </div>
              <button
                onClick={addAntibiotic}
                disabled={!formData.antibioticList[formData.antibioticList.length - 1]?.medication || !formData.antibioticList[formData.antibioticList.length - 1]?.date || !formData.antibioticList[formData.antibioticList.length - 1]?.timeOfDay || !formData.antibioticList[formData.antibioticList.length - 1]?.dosage}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  !formData.antibioticList[formData.antibioticList.length - 1]?.medication || !formData.antibioticList[formData.antibioticList.length - 1]?.date || !formData.antibioticList[formData.antibioticList.length - 1]?.timeOfDay || !formData.antibioticList[formData.antibioticList.length - 1]?.dosage
                    ? 'button-disabled'
                    : 'button-cadet'
                }`}
              >
                Add Medication
              </button>
            </div>
            <div className="space-y-4">
              {formData.antibioticList.map((item, index) => (
                <div key={index} className="relative">
                  {formData.antibioticList.length > 1 && (
                    <button
                      onClick={() => removeAntibiotic(index)}
                      className="absolute -right-2 -top-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200 z-10"
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="card p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="e.g., Amoxicillin"
                        value={item.medication}
                        onChange={(e) => updateAntibiotic(index, 'medication', e.target.value)}
                        className="input-field-wizard w-full sm:flex-1"
                      />
                      <DatePicker
                        selected={item.date}
                        onChange={(date) => updateAntibiotic(index, 'date', date)}
                        placeholderText="Select date taken"
                        className="input-field-wizard w-full sm:flex-1"
                        dateFormat="dd/MM/yyyy"
                        maxDate={new Date()}
                        calendarClassName="react-datepicker-responsive"
                        enableTabLoop={false}
                      />
                      <select
                        value={item.timeOfDay}
                        onChange={(e) => updateAntibiotic(index, 'timeOfDay', e.target.value)}
                        className={`input-field-wizard w-full sm:flex-1 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                      >
                        <option value="">Select time of day</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g., 500mg)"
                      value={item.dosage}
                      onChange={(e) => updateAntibiotic(index, 'dosage', e.target.value)}
                      className="input-field-wizard max-w-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.antibioticList && (
              <div className="mt-6 p-3 bg-red-50 dark:card-inner border border-red-300 dark:border-slate-600/50 rounded-lg">
                <p className="text-red-600 dark:text-secondary text-sm">{fieldErrors.antibioticList}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Step 7: Review page
    if (currentStep === 7) {
      const formatDate = (day, month, year) => {
        if (!day || !month || !year) return 'Not specified'
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
      }

      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold font-source text-primary mb-6">
            Review your entry
          </h2>

          {/* Missed Medications */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Missed Medications:</h3>
            {formData.missedMedications && formData.missedMedicationsList.filter(item => item.medication.trim()).length > 0 ? (
              <div className="space-y-6">
                {formData.missedMedicationsList.filter(item => item.medication.trim()).map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary">None</p>
            )}
          </div>

          {/* NSAIDs */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">NSAIDs:</h3>
            {formData.nsaidUsage && formData.nsaidList.filter(item => item.medication.trim()).length > 0 ? (
              <div className="space-y-6">
                {formData.nsaidList.filter(item => item.medication.trim()).map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary">None</p>
            )}
          </div>

          {/* Antibiotics */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Antibiotics:</h3>
            {formData.antibioticUsage && formData.antibioticList.filter(item => item.medication.trim()).length > 0 ? (
              <div className="space-y-6">
                {formData.antibioticList.filter(item => item.medication.trim()).map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Medication:</span>
                      <span className="font-medium text-primary">{item.medication}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Dosage:</span>
                      <span className="font-medium text-primary">{item.dosage || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Date:</span>
                      <span className="font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-300 dark:border-slate-700/50">
                      <span className="text-secondary">Time of Day:</span>
                      <span className="font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary">None</p>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className={`max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 min-w-0 flex flex-col justify-center sm:flex-grow ${currentStep > 0 ? 'pb-20 lg:pb-0' : ''}`}>
      {/* Back Button - Hide on landing page and first question */}
      {currentStep > 1 && (
        <div className="mb-4 sm:mb-8">
          <button
            onClick={prevStep}
            className="text-cadet-blue hover:text-cadet-blue/80 hover:underline text-base font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      )}

      {/* Section Header - Hide on landing page */}
      {currentStep > 0 && (
        <div className="mb-8">
          <h1 className="text-base sm:text-lg font-regular text-muted mb-3">Track Medications</h1>
          <div className="border-b border-slate-300 dark:border-slate-700/50"></div>
        </div>
      )}

      {/* Wizard Container */}
      <div className="mb-4">
        {/* Step 0: Landing Page */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-16 sm:pt-0">
            {/* Icon - same as home page medications card */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{backgroundColor: 'var(--bg-goal-icon-medication)'}}>
              <Pill className="w-8 h-8" style={{color: 'var(--text-goal-icon-medication)'}} />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">Track Medications</h2>
            
            {/* Optional description */}
            <p className="text-lg sm:text-xl font-roboto text-muted mb-8 max-w-md">Track your medication adherence to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors"
            >
              Start now
            </button>
          </div>
        )}

        {/* Other Steps */}
        {currentStep > 0 && (
          <div>
            {renderStep()}
          </div>
        )}

        {/* Navigation Buttons - Hide on landing page (step 0) */}
        {currentStep > 0 && (
          <div className={`flex justify-start items-center ${currentStep === 7 ? 'mt-8' : 'mt-6'}`}>
            {currentStep < 7 ? (
              <button
                onClick={nextStep}
                className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors"
              >
                Submit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handlePatternModalCancel}
        title="Cancel medication tracking?"
        message="Are you sure you want to cancel? Your progress will be lost."
        confirmText="Yes, cancel"
        cancelText="No, continue"
        isDestructive={false}
      />
    </div>
  )
}

export default function MedicationTrackingPage() {
  return (
    <ProtectedRoute>
      <MedicationTrackingWizard />
    </ProtectedRoute>
  )
}

