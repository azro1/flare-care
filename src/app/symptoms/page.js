'use client'

import { useState } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from '@/components/DatePicker'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes, sanitizeFoodTriggers } from '@/lib/sanitize'

function SymptomsPageContent() {
  const { data: symptoms, setData: setSymptoms, deleteData: deleteSymptom } = useDataSync('flarecare-symptoms', [])
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    symptomStartDate: '',
    isOngoing: true,
    symptomEndDate: '',
    severity: 5,
    stress_level: 5,
    normal_bathroom_frequency: '',
    bathroom_frequency_changed: '',
    bathroom_frequency_change_details: '',
    notes: '',
    breakfast: [{ food: '', quantity: '' }],
    lunch: [{ food: '', quantity: '' }],
    dinner: [{ food: '', quantity: '' }],
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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })

  const totalSteps = 14

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
      
      // Check for validation errors
      if (dateErrors.day || dateErrors.month || dateErrors.year) {
        return
      }
      
      // Create the date string and store it
      const dateString = `${dateInputs.year}-${dateInputs.month.padStart(2, '0')}-${dateInputs.day.padStart(2, '0')}`
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
      
      // Create the end date string and store it
      const endDateString = `${dateInputs.endYear}-${dateInputs.endMonth.padStart(2, '0')}-${dateInputs.endDay.padStart(2, '0')}`
      setFormData(prev => ({ ...prev, symptomEndDate: endDateString }))
    }
    
    // Skip step 3 (end date) if symptoms are ongoing
    if (currentStep === 2 && formData.isOngoing === true) {
      setCurrentStep(4) // Skip to step 4 (severity)
    }
    // Skip step 7 (bathroom frequency change) if frequency is 0
    else if (currentStep === 6 && (!formData.normal_bathroom_frequency || parseInt(formData.normal_bathroom_frequency) === 0)) {
      setCurrentStep(9) // Skip to step 9 (smoking)
    }
    // Skip step 8 (bathroom frequency change details) if no change
    else if (currentStep === 7 && formData.bathroom_frequency_changed === 'no') {
      setCurrentStep(9) // Skip to step 9 (smoking)
    }
    // Skip step 10 (smoking details) if they don't smoke
    else if (currentStep === 9 && formData.smoking === false) {
      setCurrentStep(11) // Skip to step 11 (alcohol)
    }
    // Skip step 12 (alcohol details) if they don't drink
    else if (currentStep === 11 && formData.alcohol === false) {
      setCurrentStep(13) // Skip to step 13 (meal tracking)
    }
    else if (currentStep < totalSteps) {
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
    }
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : (type === 'radio' && (value === 'true' || value === 'false') ? value === 'true' : value)
      }
      
      // Clear bathroom frequency change fields if normal frequency is 0 or empty
      if (name === 'normal_bathroom_frequency' && (!value || parseInt(value) === 0)) {
        newData.bathroom_frequency_changed = ''
        newData.bathroom_frequency_change_details = ''
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

  const handleSubmit = () => {
    // Check if there's any meal data
    const hasMealData = formData.breakfast.some(item => item.food.trim()) ||
                       formData.lunch.some(item => item.food.trim()) ||
                       formData.dinner.some(item => item.food.trim())
    
    if (!formData.notes.trim() && !hasMealData) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Missing Information', 
        message: 'Please add some notes or meal information to log this entry.' 
      })
      return
    }

    if (!formData.isOngoing && !formData.symptomEndDate) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Missing End Date', 
        message: 'Please specify when symptoms ended.' 
      })
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
      ...formData,
      notes: sanitizeNotes(formData.notes),
      ...sanitizedMeals,
      createdAt: new Date().toISOString()
    }

    setSymptoms([newSymptom, ...symptoms])
    
    // Reset form and go back to step 1
    setFormData({
      symptomStartDate: '',
      isOngoing: true,
      symptomEndDate: '',
      severity: 5,
      stress_level: 5,
      normal_bathroom_frequency: '',
      bathroom_frequency_changed: '',
      bathroom_frequency_change_details: '',
      notes: '',
      breakfast: [{ food: '', quantity: '' }],
      lunch: [{ food: '', quantity: '' }],
      dinner: [{ food: '', quantity: '' }],
      smoking: false,
      smoking_details: '',
      alcohol: false,
      alcohol_units: ''
    })
    setCurrentStep(1)
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
      {/* Header Section - Keep Original */}
      <div className="mb-4 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-3 sm:mb-4">
              Track Your Symptoms
            </h1>
            <p className="text-gray-600 font-roboto">
              Monitor your health patterns and identify triggers to better manage your condition.
            </p>
            {currentStep > 1 && (
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-base font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wizard Container */}
      <div className="mb-4">
        {/* Step 1: When did symptoms begin? */}
        {currentStep === 1 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">When did your symptoms begin?</h3>
            {(dateErrors.day || dateErrors.month || dateErrors.year) && (
              <p className="text-red-500 text-sm mb-4">
                {dateErrors.day || dateErrors.month || dateErrors.year}
              </p>
            )}
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
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
                  className={`w-full px-3 py-2 bg-white border-2 focus:outline-none focus:ring-4 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    dateErrors.day 
                      ? 'border-red-400 focus:ring-red-100 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                  }`}
                />
              </div>
              <div className="w-14">
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
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
                  className={`w-full px-3 py-2 bg-white border-2 focus:outline-none focus:ring-4 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    dateErrors.month 
                      ? 'border-red-400 focus:ring-red-100 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                  }`}
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
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
                  className={`w-full px-3 py-2 bg-white border-2 focus:outline-none focus:ring-4 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    dateErrors.year 
                      ? 'border-red-400 focus:ring-red-100 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Are symptoms still ongoing? */}
        {currentStep === 2 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Are symptoms still ongoing?</h3>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">When did symptoms end?</h3>
            {(dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear) && (
              <p className="text-red-500 text-sm mb-4">
                {dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear}
              </p>
            )}
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
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
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="w-14">
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
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
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
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
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Symptom Severity */}
        {currentStep === 4 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How severe are your symptoms?</h3>
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
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        )}

        {/* Step 5: Stress Level */}
        {currentStep === 5 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How stressed are you feeling?</h3>
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
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        )}

        {/* Step 6: Bathroom Frequency */}
        {currentStep === 6 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bathroom frequency</h3>
            <p className="text-gray-600 mb-4">How many times a day do you usually empty your bowels?</p>
            <div className="w-14">
              <input
                type="number"
                id="normal_bathroom_frequency"
                name="normal_bathroom_frequency"
                min="0"
                max="50"
                value={formData.normal_bathroom_frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 text-left text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        )}

        {/* Step 7: Bathroom Frequency Change Question */}
        {currentStep === 7 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bathroom Frequency</h3>
            <p className="text-gray-600 mb-4">Have you noticed a change in bathroom frequency since symptoms started?</p>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Describe your change</h3>
            <textarea
              id="bathroom_frequency_change_details"
              name="bathroom_frequency_change_details"
              rows="4"
              value={formData.bathroom_frequency_change_details}
              onChange={handleInputChange}
              placeholder="e.g., increased to 8-10 times per day, blood present, mucus, loose stools..."
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 resize-none"
            />
          </div>
        )}

        {/* Step 9: Do you smoke? */}
        {currentStep === 9 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you smoke?</h3>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Please describe your smoking habits</h3>
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
          </div>
        )}

        {/* Step 11: Do you drink alcohol? */}
        {currentStep === 11 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you drink alcohol?</h3>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How many units of alcohol do you drink per day?</h3>
            <input
              type="text"
              id="alcohol_units"
              name="alcohol_units"
              value={formData.alcohol_units}
              onChange={handleInputChange}
              placeholder="e.g., 2-3 units, occasional glass of wine, etc."
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
              autoComplete="off"
            />
          </div>
        )}

        {/* Step 13: Meal Tracking */}
        {currentStep === 13 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Meal tracking</h3>
            <p className="text-gray-600 mb-4">What did you eat? (Optional)</p>
            
            <div className="space-y-6">
              {/* Breakfast */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold font-roboto text-gray-900">
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
              </div>

              {/* Lunch */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold font-roboto text-gray-900">
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
              </div>

              {/* Dinner */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold font-roboto text-gray-900">
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
              </div>
            </div>
          </div>
        )}

        {/* Step 14: Notes & Review */}
        {currentStep === 14 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional notes</h3>
            <p className="text-gray-600 mb-6">Any other details you'd like to add?</p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="4"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Describe your symptoms, how you're feeling, any triggers you noticed..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 resize-none"
                />
              </div>

              {/* Review Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Review your entry</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">{formData.symptomStartDate ? new Date(formData.symptomStartDate).toLocaleDateString() : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{formData.isOngoing ? 'Ongoing' : 'Ended'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Severity:</span>
                    <span className="font-medium">{formData.severity}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stress Level:</span>
                    <span className="font-medium">{formData.stress_level}/10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-start items-center mt-4">
          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Submit Entry
            </button>
          )}
        </div>
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
