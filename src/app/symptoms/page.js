'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from '@/components/DatePicker'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes, sanitizeFoodTriggers } from '@/lib/sanitize'
import { supabase, TABLES } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

function SymptomsPageContent() {
  const { data: symptoms, setData: setSymptoms, deleteData: deleteSymptom } = useDataSync('flarecare-symptoms', [])
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  // ✅ Prevent body scrolling for symptoms pages (mobile-friendly)
  // useEffect(() => {
  //   // Disable scroll for symptoms pages
  //   document.body.style.position = 'fixed'
  //   document.body.style.width = '100%'
  //   document.body.style.height = '100%'
    
  //   // 🧹 Cleanup on unmount
  //   return () => {
  //     document.body.style.position = 'static'
  //     document.body.style.width = 'auto'
  //     document.body.style.height = 'auto'
  //   }
  // }, [])

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    symptomStartDate: '',
    isOngoing: true,
    symptomEndDate: '',
    severity: '',
    stress_level: '',
    normal_bathroom_frequency: '',
    bathroom_frequency_changed: 'no',
    bathroom_frequency_change_details: '',
    notes: '',
    breakfast: [{ food: '', quantity: '' }],
    lunch: [{ food: '', quantity: '' }],
    dinner: [{ food: '', quantity: '' }],
    breakfast_skipped: false,
    lunch_skipped: false,
    dinner_skipped: false,
    smoking: false,
    smoking_details: '',
    alcohol: false,
    alcohol_units: ''
  })
  const [dateInputs, setDateInputs] = useState({
    day: '',
    month: '',
    year: '',
    endDay: '',
    endMonth: '',
    endYear: ''
  })
  const [dateErrors, setDateErrors] = useState({
    day: '',
    month: '',
    year: '',
    endDay: '',
    endMonth: '',
    endYear: ''
  })
  const [fieldErrors, setFieldErrors] = useState({
    bathroom_frequency_change_details: '',
    smoking_details: '',
    severity: '',
    stress_level: '',
    normal_bathroom_frequency: '',
    alcohol_units: ''
  })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = 16

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      // Check if date inputs are filled
      if (!dateInputs.day || !dateInputs.month || !dateInputs.year) {
        setDateErrors({
          day: 'Please enter the date your symptoms began',
          month: '',
          year: ''
        })
        return
      }
      
      // Validate date values
      const day = parseInt(dateInputs.day)
      const month = parseInt(dateInputs.month)
      const year = parseInt(dateInputs.year)
      
      // Check for valid ranges
      if (day < 1 || day > 31) {
        setDateErrors({
          day: 'Day must be between 1 and 31',
          month: '',
          year: ''
        })
        return
      }
      
      if (month < 1 || month > 12) {
        setDateErrors({
          day: '',
          month: 'Month must be between 1 and 12',
          year: ''
        })
        return
      }
      
      if (year < 2020 || year > new Date().getFullYear()) {
        setDateErrors({
          day: '',
          month: '',
          year: `Year must be between 2020 and ${new Date().getFullYear()}`
        })
        return
      }
      
      // Check if it's a valid date
      const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const testDate = new Date(dateString)
      
      if (isNaN(testDate.getTime()) || testDate.getDate() !== day || testDate.getMonth() !== (month - 1) || testDate.getFullYear() !== year) {
        setDateErrors({
          day: 'Please enter a valid date',
          month: '',
          year: ''
        })
        return
      }
      
      // Clear any existing errors since validation passed
      setDateErrors({ day: '', month: '', year: '', endDay: '', endMonth: '', endYear: '' })
      
      // Create the date string and store it
      setFormData(prev => ({ ...prev, symptomStartDate: dateString }))
    }
    
    // Validate step 3 (end date) if symptoms are not ongoing
    if (currentStep === 3) {
      if (!dateInputs.endDay || !dateInputs.endMonth || !dateInputs.endYear) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Please enter the date your symptoms ended',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      // Validate end date values
      const endDay = parseInt(dateInputs.endDay)
      const endMonth = parseInt(dateInputs.endMonth)
      const endYear = parseInt(dateInputs.endYear)
      
      // Check for valid ranges
      if (endDay < 1 || endDay > 31) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Day must be between 1 and 31',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      if (endMonth < 1 || endMonth > 12) {
        setDateErrors(prev => ({
          ...prev,
          endDay: '',
          endMonth: 'Month must be between 1 and 12',
          endYear: ''
        }))
        return
      }
      
      if (endYear < 2020 || endYear > new Date().getFullYear()) {
        setDateErrors(prev => ({
          ...prev,
          endDay: '',
          endMonth: '',
          endYear: `Year must be between 2020 and ${new Date().getFullYear()}`
        }))
        return
      }
      
      // Check if it's a valid date
      const endDateString = `${endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`
      const testEndDate = new Date(endDateString)
      
      if (isNaN(testEndDate.getTime()) || testEndDate.getDate() !== endDay || testEndDate.getMonth() !== (endMonth - 1) || testEndDate.getFullYear() !== endYear) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Please enter a valid date',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      // Clear any existing errors since validation passed
      setDateErrors({ day: '', month: '', year: '', endDay: '', endMonth: '', endYear: '' })
      
      // Create the end date string and store it
      setFormData(prev => ({ ...prev, symptomEndDate: endDateString }))
    }
    
    // Skip step 3 (end date) if symptoms are ongoing
    if (currentStep === 2 && formData.isOngoing === true) {
      setCurrentStep(4) // Skip to step 4 (severity)
      return
    }
    
    // Validate step 4 (severity) - must be filled
    if (currentStep === 4) {
      if (!formData.severity || formData.severity === '') {
        setFieldErrors(prev => ({ ...prev, severity: 'Please rate your symptom severity' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, severity: '' }))
    }
    
    // Validate step 5 (stress level) - must be filled
    if (currentStep === 5) {
      if (!formData.stress_level || formData.stress_level === '') {
        setFieldErrors(prev => ({ ...prev, stress_level: 'Please rate your stress level' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, stress_level: '' }))
    }
    // Validate step 6 (bathroom frequency) - must be filled
    if (currentStep === 6) {
      if (!formData.normal_bathroom_frequency || formData.normal_bathroom_frequency === '') {
        setFieldErrors(prev => ({ ...prev, normal_bathroom_frequency: 'Please enter your normal bathroom frequency' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, normal_bathroom_frequency: '' }))
      
      // Skip step 7 if frequency is 0
      if (parseInt(formData.normal_bathroom_frequency) === 0) {
        setCurrentStep(9) // Skip to step 9 (smoking)
        return
      }
    }
    
    // Skip step 8 (bathroom frequency change details) if no change
    if (currentStep === 7 && formData.bathroom_frequency_changed === 'no') {
      setCurrentStep(9) // Skip to step 9 (smoking)
      return
    }
    
    // Validate step 8 (bathroom frequency change details) - must be filled if they said yes
    if (currentStep === 8) {
      if (!formData.bathroom_frequency_change_details || formData.bathroom_frequency_change_details.trim() === '') {
        setFieldErrors(prev => ({ ...prev, bathroom_frequency_change_details: 'Please describe your bathroom frequency change' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, bathroom_frequency_change_details: '' }))
    }
    
    // Skip step 10 (smoking details) if they don't smoke
    if (currentStep === 9 && formData.smoking === false) {
      setCurrentStep(11) // Skip to step 11 (alcohol)
      return
    }
    
    // Validate step 10 (smoking details) - must be filled if they smoke
    if (currentStep === 10) {
      if (!formData.smoking_details || formData.smoking_details.trim() === '') {
        setFieldErrors(prev => ({ ...prev, smoking_details: 'Please describe your smoking habits' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, smoking_details: '' }))
    }
    
    // Skip step 12 (alcohol details) if they don't drink
    if (currentStep === 11 && formData.alcohol === false) {
      setCurrentStep(13) // Skip to step 13 (meal tracking)
      return
    }
    
    // Validate step 12 (alcohol units) - must be filled if they drink
    if (currentStep === 12) {
      if (!formData.alcohol_units || formData.alcohol_units === '') {
        setFieldErrors(prev => ({ ...prev, alcohol_units: 'Please enter how many units of alcohol you drink per day' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, alcohol_units: '' }))
    }
    
    // Validate step 13 (meals) - must have food or mark as skipped for each meal
    if (currentStep === 13) {
      const hasBreakfast = formData.breakfast.some(meal => meal.food.trim()) || formData.breakfast_skipped
      const hasLunch = formData.lunch.some(meal => meal.food.trim()) || formData.lunch_skipped
      const hasDinner = formData.dinner.some(meal => meal.food.trim()) || formData.dinner_skipped
      
      if (!hasBreakfast || !hasLunch || !hasDinner) {
        setFieldErrors(prev => ({ ...prev, meals: 'Please enter what you ate for each meal or check "I didn\'t eat anything"' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, meals: '' }))
    }
    
    // Move to next step if no validation issues
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    // Add validation for number inputs
    if (type === 'number') {
      const numValue = parseInt(value)
      
      // Severity and stress level: 1-10
      if ((name === 'severity' || name === 'stress_level') && value && (numValue < 1 || numValue > 10)) {
        return // Don't update if invalid
      }
      
      // Bathroom frequency: 0-99 (2 digits max)
      if (name === 'normal_bathroom_frequency') {
        if (value.length > 2) {
          return // Don't update if more than 2 digits
        }
        if (value && (numValue < 0 || numValue > 99)) {
          return // Don't update if invalid range
        }
      }
      
      // Alcohol units: 0-30 (2 digits max)
      if (name === 'alcohol_units') {
        if (value.length > 2) {
          return // Don't update if more than 2 digits
        }
        if (value && (numValue < 0 || numValue > 30)) {
          return // Don't update if invalid range
        }
      }
    }
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : (type === 'radio' && (value === 'true' || value === 'false') ? value === 'true' : value)
      }
      
      // Clear bathroom frequency change fields if normal frequency is 0 or empty
      if (name === 'normal_bathroom_frequency' && (!value || parseInt(value) === 0)) {
        newData.bathroom_frequency_changed = 'no'
        newData.bathroom_frequency_change_details = ''
        setFieldErrors(prev => ({ ...prev, bathroom_frequency_change_details: '' }))
      }
      
      // Clear field errors when user starts typing
      if (name === 'bathroom_frequency_change_details' || name === 'smoking_details' || name === 'severity' || name === 'stress_level' || name === 'normal_bathroom_frequency' || name === 'alcohol_units') {
        setFieldErrors(prev => ({ ...prev, [name]: '' }))
      }
      
      return newData
    })
  }

  const handleDateInputChange = (field, value) => {
    // Update the input value
    setDateInputs(prev => ({ ...prev, [field]: value }))
    
    // Clear any existing error for this field
    setDateErrors(prev => ({ ...prev, [field]: '' }))
    
    // Validate the input
    let error = ''
    const numValue = parseInt(value)
    
    if (value && !isNaN(numValue)) {
      switch (field) {
        case 'day':
        case 'endDay':
          if (numValue < 1 || numValue > 31) {
            error = 'Day must be between 1 and 31'
          }
          break
        case 'month':
        case 'endMonth':
          if (numValue < 1 || numValue > 12) {
            error = 'Month must be between 1 and 12'
          }
          break
        case 'year':
        case 'endYear':
          if (value.length === 4) {
            if (numValue < 2020 || numValue > new Date().getFullYear()) {
              error = `Year must be between 2020 and ${new Date().getFullYear()}`
            }
          }
          break
      }
    }
    
    if (error) {
      setDateErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    // Check if there's any meal data
    const hasMealData = formData.breakfast.some(item => item.food.trim()) ||
                       formData.lunch.some(item => item.food.trim()) ||
                       formData.dinner.some(item => item.food.trim()) ||
                       formData.breakfast_skipped || formData.lunch_skipped || formData.dinner_skipped
    
    if (!formData.notes.trim() && !hasMealData) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Missing Information', 
        message: 'Please add some notes or meal information to log this entry.' 
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.isOngoing && !formData.symptomEndDate) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Missing End Date', 
        message: 'Please specify when symptoms ended.' 
      })
      setIsSubmitting(false)
      return
    }

    // Sanitize meal data
    const sanitizedMeals = {
      breakfast: formData.breakfast.map(item => ({
        food: sanitizeFoodTriggers(item.food),
        quantity: sanitizeFoodTriggers(item.quantity)
      })).filter(item => item.food.trim()),
      lunch: formData.lunch.map(item => ({
        food: sanitizeFoodTriggers(item.food),
        quantity: sanitizeFoodTriggers(item.quantity)
      })).filter(item => item.food.trim()),
      dinner: formData.dinner.map(item => ({
        food: sanitizeFoodTriggers(item.food),
        quantity: sanitizeFoodTriggers(item.quantity)
      })).filter(item => item.food.trim())
    }

    const newSymptom = {
      id: Date.now().toString(),
      user_id: user?.id || 'anonymous',
      symptom_start_date: formData.symptomStartDate || null,
      is_ongoing: formData.isOngoing,
      symptom_end_date: formData.symptomEndDate || null,
      severity: formData.severity,
      stress_level: formData.stress_level,
      normal_bathroom_frequency: formData.normal_bathroom_frequency,
      bathroom_frequency_changed: formData.bathroom_frequency_changed,
      bathroom_frequency_change_details: formData.bathroom_frequency_change_details,
      smoking: formData.smoking,
      smoking_details: formData.smoking_details,
      alcohol: formData.alcohol,
      alcohol_units: formData.alcohol_units,
      notes: sanitizeNotes(formData.notes),
      ...sanitizedMeals,
      created_at: new Date().toISOString()
    }

    try {
      // Save to Supabase
      const { error } = await supabase
        .from(TABLES.SYMPTOMS)
        .insert([newSymptom])

      if (error) throw error

      // Update local state
    setSymptoms([newSymptom, ...symptoms])
      
      // Reset form immediately
    setFormData({
        symptomStartDate: '',
      isOngoing: true,
      symptomEndDate: '',
        severity: '',
        stress_level: '',
        normal_bathroom_frequency: '',
        bathroom_frequency_changed: 'no',
        bathroom_frequency_change_details: '',
      notes: '',
      breakfast: [{ food: '', quantity: '' }],
      lunch: [{ food: '', quantity: '' }],
      dinner: [{ food: '', quantity: '' }],
      breakfast_skipped: false,
      lunch_skipped: false,
      dinner_skipped: false,
      smoking: false,
      smoking_details: '',
      alcohol: false,
      alcohol_units: ''
    })
      setCurrentStep(0)
      setIsSubmitting(false)
      
      // Redirect to homepage immediately
      router.push('/')
    } catch (error) {
      console.error('Error saving symptoms:', error)
      setIsSubmitting(false)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save your symptoms. Please try again.'
      })
    }
  }

  const handleDeleteSymptom = (id) => {
    setDeleteModal({ isOpen: true, id })
  }

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await deleteSymptom(deleteModal.id)
    }
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: null })
  }

  const getSeverityColor = (severity) => {
    if (severity <= 3) return 'text-green-600 bg-green-100'
    if (severity <= 6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSeverityLabel = (severity) => {
    if (severity <= 3) return 'Mild'
    if (severity <= 6) return 'Moderate'
    if (severity <= 8) return 'Severe'
    return 'Very Severe'
  }

  const getStressLabel = (stress) => {
    if (stress <= 3) return 'Low'
    if (stress <= 6) return 'Moderate'
    if (stress <= 8) return 'High'
    return 'Very High'
  }

  const getStressColor = (stress) => {
    if (stress <= 3) return 'text-green-600 bg-green-100'
    if (stress <= 6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getMealLabel = (mealType) => {
    if (!formData.symptomStartDate) {
      return `What did you have for ${mealType}?`
    }
    
    const symptomDate = new Date(formData.symptomStartDate)
    const today = new Date()
    const isToday = symptomDate.toDateString() === today.toDateString()
    
    if (isToday) {
      return `What did you have for ${mealType}?`
    } else {
      const dateStr = symptomDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      })
      return `What did you have for ${mealType} on ${dateStr}?`
    }
  }

  const addMealItem = (mealType) => {
    setFormData(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], { food: '', quantity: '' }]
    }))
  }

  const removeMealItem = (mealType, index) => {
    setFormData(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index)
    }))
  }

  const updateMealItem = (mealType, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [mealType]: prev[mealType].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  return (
    <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 min-w-0 flex flex-col flex-grow justify-center">
      {/* Header Section - Hide on landing page */}
      {currentStep > 0 && (
        <div className="mb-4 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-3 sm:mb-4">
              Track Your Symptoms
            </h1>
            <p className="text-gray-600 font-roboto">
              Monitor your health patterns and identify triggers to better manage your condition
            </p>
              <div className="mt-4">
                {currentStep !== 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-base font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}
                <div className="mt-4 border-b border-gray-200"></div>
          </div>
          </div>
        </div>
      </div>
      )}

      {/* Wizard Container */}
      <div className="mb-4">
        {/* Step 0: Landing Page */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            {/* Icon - same as home page symptoms card */}
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Log Symptoms</h2>
            
            {/* Optional description */}
            <p className="text-lg sm:text-xl font-roboto text-gray-600 mb-8 max-w-md">Track your daily symptoms to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Let's go!
            </button>
        </div>
        )}

        {/* Step 1: When did symptoms begin? */}
        {currentStep === 1 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">When did your symptoms begin?</h3>
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-base font-medium text-gray-700 mb-2">Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dateInputs.day}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 2) {
                      value = value.slice(0, 2);
                    }
                    handleDateInputChange('day', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              <div className="w-14">
                <label className="block text-base font-medium text-gray-700 mb-2">Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={dateInputs.month}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 2) {
                      value = value.slice(0, 2);
                    }
                    handleDateInputChange('month', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="w-24">
                <label className="block text-base font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  min="2020"
                  max={new Date().getFullYear()}
                  value={dateInputs.year}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 4) {
                      value = value.slice(0, 4);
                    }
                    handleDateInputChange('year', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            {(dateErrors.day || dateErrors.month || dateErrors.year) && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{dateErrors.day || dateErrors.month || dateErrors.year}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Are symptoms still ongoing? */}
        {currentStep === 2 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Are symptoms still ongoing?</h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="true"
                    checked={formData.isOngoing === true}
                    onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                  />
                <span className="ml-3 text-lg text-gray-700">Yes</span>
                </label>
              <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="false"
                    checked={formData.isOngoing === false}
                    onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                  />
                <span className="ml-3 text-lg text-gray-700">No</span>
                </label>
              </div>
            </div>
        )}

        {/* Step 3: When did symptoms end? (only if not ongoing) */}
        {currentStep === 3 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">When did symptoms end?</h3>
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-base font-medium text-gray-700 mb-2">Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dateInputs.endDay || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 2) {
                      value = value.slice(0, 2);
                    }
                    handleDateInputChange('endDay', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              <div className="w-14">
                <label className="block text-base font-medium text-gray-700 mb-2">Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={dateInputs.endMonth || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 2) {
                      value = value.slice(0, 2);
                    }
                    handleDateInputChange('endMonth', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
              <div className="w-24">
                <label className="block text-base font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  min="2020"
                  max={new Date().getFullYear()}
                  value={dateInputs.endYear || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.length > 4) {
                      value = value.slice(0, 4);
                    }
                    handleDateInputChange('endYear', value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            {(dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear) && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Symptom Severity */}
        {currentStep === 4 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
              {formData.isOngoing ? 'How severe are your symptoms?' : 'How severe were your symptoms?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">Rate from 1 (mild) to 10 (severe)</p>
            <div className="w-14">
                <input
                  type="number"
                  id="severity"
                  name="severity"
                  min="1"
                  max="10"
                  value={formData.severity}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
                {fieldErrors.severity && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.severity}</p>
              </div>
                )}
              </div>
        )}

        {/* Step 5: Stress Level */}
        {currentStep === 5 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
              {formData.isOngoing ? 'How stressed are you feeling?' : 'How stressed were you feeling during that time?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">Rate from 1 (calm) to 10 (very stressed)</p>
            <div className="w-14">
                <input
                  type="number"
                  id="stress_level"
                  name="stress_level"
                  min="1"
                  max="10"
                  value={formData.stress_level}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
                {fieldErrors.stress_level && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.stress_level}</p>
              </div>
                )}
              </div>
        )}

        {/* Step 6: Bathroom Frequency */}
        {currentStep === 6 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">How many times a day do you usually empty your bowels?</h3>
            <p className="text-gray-600 mb-4"></p>
            <div className="w-14">
              <input
                type="number"
                id="normal_bathroom_frequency"
                name="normal_bathroom_frequency"
                min="0"
                max="50"
                value={formData.normal_bathroom_frequency}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  // Prevent 'e', 'E', '+', '-', '.' from being entered
                  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              {fieldErrors.normal_bathroom_frequency && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{fieldErrors.normal_bathroom_frequency}</p>
          </div>
              )}
            </div>
        )}

        {/* Step 7: Bathroom Frequency Change Question */}
        {currentStep === 7 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              {formData.isOngoing ? 'Have you noticed a change in bathroom frequency since symptoms started?' : 'Did you notice a change in bathroom frequency during that time?'}
            </h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="bathroom_frequency_changed"
                  value="yes"
                  checked={formData.bathroom_frequency_changed === 'yes'}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">Yes</span>
            </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="bathroom_frequency_changed"
                  value="no"
                  checked={formData.bathroom_frequency_changed === 'no'}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 8: Bathroom Frequency Change Details */}
        {currentStep === 8 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Describe your change</h3>
            <textarea
              id="bathroom_frequency_change_details"
              name="bathroom_frequency_change_details"
              rows="4"
              value={formData.bathroom_frequency_change_details}
              onChange={handleInputChange}
              placeholder="e.g., increased to 8-10 times per day, blood present, mucus, loose stools..."
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 resize-none"
            />
            {fieldErrors.bathroom_frequency_change_details && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{fieldErrors.bathroom_frequency_change_details}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 9: Do you smoke? */}
        {currentStep === 9 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Do you smoke?</h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="smoking"
                  value="true"
                  checked={formData.smoking === true}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="smoking"
                  value="false"
                  checked={formData.smoking === false}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 10: Smoking details (only if they smoke) */}
        {currentStep === 10 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Please describe your smoking habits</h3>
                <input
                  type="text"
                  id="smoking_details"
                  name="smoking_details"
                  value={formData.smoking_details}
                  onChange={handleInputChange}
                  placeholder="e.g., 1 pack of cigarettes per day, occasional cigars, etc."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                  autoComplete="off"
                />
                {fieldErrors.smoking_details && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.smoking_details}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 11: Do you drink alcohol? */}
        {currentStep === 11 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Do you drink alcohol?</h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="alcohol"
                  value="true"
                  checked={formData.alcohol === true}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="alcohol"
                  value="false"
                  checked={formData.alcohol === false}
                  onChange={handleInputChange}
                  className="w-6 h-6 text-blue-600"
                />
                <span className="ml-3 text-lg text-gray-700">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 12: Alcohol details (only if they drink) */}
        {currentStep === 12 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">How many units of alcohol do you drink per day?</h3>
            <div className="w-14">
                <input
                type="number"
                  id="alcohol_units"
                  name="alcohol_units"
                min="0"
                max="30"
                  value={formData.alcohol_units}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    // Prevent 'e', 'E', '+', '-', '.' from being entered
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {fieldErrors.alcohol_units && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{fieldErrors.alcohol_units}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 13: Meal Tracking */}
        {currentStep === 13 && (
          <div className="mb-5">
 
            
            <div className="space-y-6">
            {/* Breakfast */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  {getMealLabel('breakfast')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('breakfast')}
                    disabled={formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                  Add
                </button>
              </div>
                <div className="space-y-3">
                {formData.breakfast.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.breakfast.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('breakfast', index)}
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md z-10 hover:bg-red-600 transition-all duration-200"
                        title="Remove item"
                      >
                          <span className="text-white text-sm font-bold leading-none">×</span>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('breakfast', index, 'food', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('breakfast', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Breakfast skipped checkbox */}
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.breakfast_skipped}
                    onChange={(e) => setFormData(prev => ({ ...prev, breakfast_skipped: e.target.checked }))}
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-600">I didn't eat anything for breakfast</span>
                </label>
              </div>
            </div>

            {/* Lunch */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  {getMealLabel('lunch')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('lunch')}
                    disabled={formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                  Add
                </button>
              </div>
                <div className="space-y-3">
                {formData.lunch.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.lunch.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('lunch', index)}
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md z-10 hover:bg-red-600 transition-all duration-200"
                        title="Remove item"
                      >
                          <span className="text-white text-sm font-bold leading-none">×</span>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('lunch', index, 'food', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('lunch', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Lunch skipped checkbox */}
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.lunch_skipped}
                    onChange={(e) => setFormData(prev => ({ ...prev, lunch_skipped: e.target.checked }))}
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-600">I didn't eat anything for lunch</span>
                </label>
              </div>
            </div>

            {/* Dinner */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  {getMealLabel('dinner')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('dinner')}
                    disabled={formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                  Add
                </button>
              </div>
                <div className="space-y-3">
                {formData.dinner.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.dinner.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('dinner', index)}
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md z-10 hover:bg-red-600 transition-all duration-200"
                        title="Remove item"
                      >
                          <span className="text-white text-sm font-bold leading-none">×</span>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('dinner', index, 'food', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('dinner', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
          </div>

              {/* Dinner skipped checkbox */}
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dinner_skipped}
                    onChange={(e) => setFormData(prev => ({ ...prev, dinner_skipped: e.target.checked }))}
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-600">I didn't eat anything for dinner</span>
                </label>
          </div>
      </div>
        </div>
        
          {/* Validation error message */}
          {fieldErrors.meals && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{fieldErrors.meals}</p>
            </div>
                      )}
                    </div>
        )}

        {/* Step 14: Additional Notes */}
        {currentStep === 14 && (
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Additional notes</h3>            
            <div>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any other details you'd like to add? e.g. describe your symptoms, how you're feeling, any triggers you noticed..."
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 resize-none"
              />
                    </div>
                  </div>
        )}

        {/* Step 15: Review */}
        {currentStep === 15 && (
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">Review your entry</h3>
            <div className="space-y-4">
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">{formData.symptomStartDate ? new Date(formData.symptomStartDate).toLocaleDateString() : 'Not set'}</span>
                </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{formData.isOngoing ? 'Ongoing' : 'Ended'}</span>
                      </div>
        
              {!formData.isOngoing && formData.symptomEndDate && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-medium">{new Date(formData.symptomEndDate).toLocaleDateString()}</span>
                  </div>
                )}

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Severity:</span>
                <span className="font-medium">{formData.severity}/10</span>
                      </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Stress Level:</span>
                <span className="font-medium">{formData.stress_level}/10</span>
                    </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Bathroom Frequency:</span>
                <span className="font-medium">{formData.normal_bathroom_frequency || 'Not set'} times/day</span>
                </div>

              {formData.bathroom_frequency_changed && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Frequency Changed:</span>
                  <span className="font-medium">{formData.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</span>
                  </div>
                )}

              {formData.bathroom_frequency_changed === 'yes' && formData.bathroom_frequency_change_details && (
                <div className="py-2 border-b border-gray-200">
                  <span className="text-gray-600 block mb-1">Describe your change:</span>
                  <span className="font-medium">{formData.bathroom_frequency_change_details}</span>
                  </div>
                )}

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Smoking:</span>
                <span className="font-medium">{formData.smoking ? 'Yes' : 'No'}</span>
                      </div>

              {formData.smoking && formData.smoking_details && (
                <div className="py-2 border-b border-gray-200">
                  <span className="text-gray-600 block mb-1">Smoking Habits:</span>
                  <span className="font-medium">{formData.smoking_details}</span>
                  </div>
                )}

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Alcohol:</span>
                <span className="font-medium">{formData.alcohol ? 'Yes' : 'No'}</span>
                    </div>
                    
              {formData.alcohol && formData.alcohol_units && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Alcohol Units:</span>
                  <span className="font-medium">{formData.alcohol_units} units/day</span>
                          </div>
                      )}
                      
              {(formData.breakfast.some(item => item.food.trim()) || 
                formData.lunch.some(item => item.food.trim()) || 
                formData.dinner.some(item => item.food.trim()) ||
                formData.breakfast_skipped || formData.lunch_skipped || formData.dinner_skipped) && (
                <div className="py-2 border-b border-gray-200">
                  <span className="text-gray-600 block mb-2">Meals:</span>
                  <div className="space-y-1 text-sm">
                    {formData.breakfast.some(item => item.food.trim()) && (
                      <div>
                        <span className="font-medium">Breakfast:</span>
                        {formData.breakfast.filter(item => item.food.trim()).map((item, index) => (
                          <span key={index} className="ml-2 text-gray-600">{item.food} ({item.quantity})</span>
                        ))}
                        </div>
                      )}
                    {formData.breakfast_skipped && (
                      <div>
                        <span className="font-medium">Breakfast:</span>
                        <span className="ml-2 text-gray-500 italic">Didn't eat anything</span>
                          </div>
                    )}
                    {formData.lunch.some(item => item.food.trim()) && (
                      <div>
                        <span className="font-medium">Lunch:</span>
                        {formData.lunch.filter(item => item.food.trim()).map((item, index) => (
                          <span key={index} className="ml-2 text-gray-600">{item.food} ({item.quantity})</span>
                        ))}
                        </div>
                      )}
                    {formData.lunch_skipped && (
                      <div>
                        <span className="font-medium">Lunch:</span>
                        <span className="ml-2 text-gray-500 italic">Didn't eat anything</span>
                          </div>
                    )}
                    {formData.dinner.some(item => item.food.trim()) && (
                      <div>
                        <span className="font-medium">Dinner:</span>
                        {formData.dinner.filter(item => item.food.trim()).map((item, index) => (
                          <span key={index} className="ml-2 text-gray-600">{item.food} ({item.quantity})</span>
                        ))}
                        </div>
                      )}
                    {formData.dinner_skipped && (
                      <div>
                        <span className="font-medium">Dinner:</span>
                        <span className="ml-2 text-gray-500 italic">Didn't eat anything</span>
                      </div>
                    )}
                    </div>
                  </div>
                )}

              {formData.notes && (
                <div className="py-2">
                  <span className="text-gray-600 block mb-2">Notes:</span>
                  <p className="font-medium">{formData.notes}</p>
                  </div>
                )}

              </div>
          </div>
        )}

        {/* Visual Separator for Review Page - only show if there are notes */}
        {currentStep === 15 && formData.notes && (
          <div className="my-8 border-t border-gray-200"></div>
        )}

        {/* Navigation Buttons - Hide on landing page (step 0) */}
        {currentStep > 0 && (
          <div className={`flex justify-start items-center ${currentStep === 15 ? 'mt-8' : 'mt-4'}`}>
            {currentStep < 15 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        )}
      </div>


      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Symptom Entry"
        message="Are you sure you want to delete this symptom entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />

      <ConfirmationModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        cancelText=""
        isDestructive={false}
      />
    </div>
  )
}

export default function SymptomsPage() {
  return (
    <ProtectedRoute>
      <SymptomsPageContent />
    </ProtectedRoute>
  )
}
