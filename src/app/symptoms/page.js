'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import SyncSettings from '@/components/SyncSettings'
import DatePicker from '@/components/DatePicker'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes, sanitizeFoodTriggers } from '@/lib/sanitize'

function SymptomsPageContent() {
  const { data: symptoms, setData: setSymptoms, deleteData: deleteSymptom, syncEnabled, setSyncEnabled, isOnline, isSyncing, syncToCloud, fetchFromCloud } = useDataSync('flarecare-symptoms', [])
  const [formData, setFormData] = useState({
    symptomStartDate: new Date().toISOString().split('T')[0],
    isOngoing: true,
    symptomEndDate: '',
    severity: 5,
    stress_level: 5,
    notes: '',
    breakfast: [{ food: '', quantity: '' }],
    lunch: [{ food: '', quantity: '' }],
    dinner: [{ food: '', quantity: '' }],
    smoking: false,
    smoking_details: '',
    alcohol: false,
    alcohol_units: ''
  })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    
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
    setFormData({
      symptomStartDate: new Date().toISOString().split('T')[0],
      isOngoing: true,
      symptomEndDate: '',
      severity: 5,
      stress_level: 5,
      notes: '',
      breakfast: [{ food: '', quantity: '' }],
      lunch: [{ food: '', quantity: '' }],
      dinner: [{ food: '', quantity: '' }],
      smoking: false,
      smoking_details: '',
      alcohol: false,
      alcohol_units: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'radio' ? value === 'true' : value)
    }))
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
    <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 min-w-0">
      {/* Header Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-3 sm:mb-4">
              Track Your Symptoms
            </h1>
            <p className="text-gray-600 font-roboto">
              Monitor your health patterns and identify triggers to better manage your condition.
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

      {/* Symptom Logging Form */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mb-8 min-w-0">
        <div className="flex items-center mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold font-source text-gray-900 min-w-0">New Symptom Entry</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Date and Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <div className="space-y-3">
              <label htmlFor="symptomStartDate" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                📅 When did symptoms begin?
              </label>
              <DatePicker
                id="symptomStartDate"
                name="symptomStartDate"
                value={formData.symptomStartDate}
                onChange={(value) => setFormData(prev => ({ ...prev, symptomStartDate: value }))}
                placeholder="Select start date"
                className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10 text-left"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
                maxDate={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                ⏰ Are symptoms still ongoing?
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="true"
                    checked={formData.isOngoing === true}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="false"
                    checked={formData.isOngoing === false}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* End Date Section */}
          {!formData.isOngoing && (
            <div className="space-y-3">
              <label htmlFor="symptomEndDate" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                🏁 When did symptoms end?
              </label>
              <DatePicker
                id="symptomEndDate"
                name="symptomEndDate"
                value={formData.symptomEndDate}
                onChange={(value) => setFormData(prev => ({ ...prev, symptomEndDate: value }))}
                placeholder="Select end date"
                className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10 text-left"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
                minDate={formData.symptomStartDate}
                maxDate={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {/* Severity and Stress Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Severity Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="severity" className="text-sm font-semibold font-roboto text-gray-800">
                  🔥 Symptom Severity
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${getSeverityColor(formData.severity).split(' ')[0]}`}>{formData.severity}</span>
                  <span className="text-sm text-gray-500">/10</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  id="severity"
                  name="severity"
                  min="1"
                  max="10"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full h-3 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 rounded-full appearance-none cursor-pointer slider-custom"
                  style={{
                    background: `linear-gradient(to right, #dbeafe 0%, #e0e7ff 50%, #bfdbfe 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-roboto">
                  <span className="text-green-600 font-medium">Mild</span>
                  <span className="text-yellow-600 font-medium">Moderate</span>
                  <span className="text-red-600 font-medium">Severe</span>
                </div>
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(formData.severity)}`}>
                  {getSeverityLabel(formData.severity)}
                </span>
              </div>
            </div>

            {/* Stress Level Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="stress_level" className="text-sm font-semibold font-roboto text-gray-800">
                  😰 Stress Level
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${getStressColor(formData.stress_level).split(' ')[0]}`}>{formData.stress_level}</span>
                  <span className="text-sm text-gray-500">/10</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  id="stress_level"
                  name="stress_level"
                  min="1"
                  max="10"
                  value={formData.stress_level}
                  onChange={handleInputChange}
                  className="w-full h-3 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 rounded-full appearance-none cursor-pointer slider-custom"
                  style={{
                    background: `linear-gradient(to right, #dbeafe 0%, #e0e7ff 50%, #bfdbfe 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-roboto">
                  <span className="text-green-600 font-medium">Calm</span>
                  <span className="text-yellow-600 font-medium">Moderate</span>
                  <span className="text-red-600 font-medium">High</span>
                </div>
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStressColor(formData.stress_level)}`}>
                  {getStressLabel(formData.stress_level)}
                </span>
              </div>
            </div>
          </div>

          {/* Smoking Status */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
              🚭 Do you smoke?
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="smoking"
                  value="true"
                  checked={formData.smoking === true}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="smoking"
                  value="false"
                  checked={formData.smoking === false}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">No</span>
              </label>
            </div>
            
            {formData.smoking && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <label htmlFor="smoking_details" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                  Please describe your smoking habits
                </label>
                <input
                  type="text"
                  id="smoking_details"
                  name="smoking_details"
                  value={formData.smoking_details}
                  onChange={handleInputChange}
                  placeholder="e.g., 1 pack of cigarettes per day, occasional cigars, etc."
                  className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white hover:bg-white transition-all duration-200"
                  style={{ backgroundColor: 'white' }}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          {/* Alcohol Status */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
              🍷 Do you drink alcohol?
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="alcohol"
                  value="true"
                  checked={formData.alcohol === true}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="alcohol"
                  value="false"
                  checked={formData.alcohol === false}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-2 border-gray-300 focus:ring-0 focus:outline-none"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">No</span>
              </label>
            </div>
            
            {formData.alcohol && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <label htmlFor="alcohol_units" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
                  How many units of alcohol do you drink per day?
                </label>
                <input
                  type="text"
                  id="alcohol_units"
                  name="alcohol_units"
                  value={formData.alcohol_units}
                  onChange={handleInputChange}
                  placeholder="e.g., 2-3 units, occasional glass of wine, etc."
                  className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white hover:bg-white transition-all duration-200"
                  style={{ backgroundColor: 'white' }}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <label htmlFor="notes" className="block text-sm font-semibold font-roboto text-gray-800 mb-3">
              📝 Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="4"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Describe your symptoms, how you're feeling, any triggers you noticed..."
              className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 resize-none shadow-sm hover:shadow-md"
            />
          </div>

          {/* Meal Tracking */}
          <div className="space-y-8">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-source text-gray-900">Meal Tracking</h3>
            </div>
            
            {/* Breakfast */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center min-w-0">
                  <span className="text-2xl mr-3 flex-shrink-0">🌅</span>
                  <h4 className="text-lg font-semibold font-source text-gray-900 min-w-0">
                    {getMealLabel('breakfast')}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('breakfast')}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md flex-shrink-0"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {formData.breakfast.map((item, index) => (
                  <div key={index} className="bg-white border-2 border-blue-200 rounded-xl p-4 relative shadow-sm hover:shadow-md transition-all duration-200">
                    {formData.breakfast.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('breakfast', index)}
                        className="absolute -left-2 -top-2 bg-white border-2 border-gray-300 rounded-full p-1.5 shadow-lg z-10 text-red-500 hover:text-red-700 hover:shadow-xl transition-all duration-200 flex-shrink-0"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('breakfast', index, 'food', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('breakfast', index, 'quantity', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lunch */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center min-w-0">
                  <span className="text-2xl mr-3 flex-shrink-0">☀️</span>
                  <h4 className="text-lg font-semibold font-source text-gray-900 min-w-0">
                    {getMealLabel('lunch')}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('lunch')}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md flex-shrink-0"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {formData.lunch.map((item, index) => (
                  <div key={index} className="bg-white border-2 border-blue-200 rounded-xl p-4 relative shadow-sm hover:shadow-md transition-all duration-200">
                    {formData.lunch.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('lunch', index)}
                        className="absolute -left-2 -top-2 bg-white border-2 border-gray-300 rounded-full p-1.5 shadow-lg z-10 text-red-500 hover:text-red-700 hover:shadow-xl transition-all duration-200 flex-shrink-0"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('lunch', index, 'food', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('lunch', index, 'quantity', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dinner */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center min-w-0">
                  <span className="text-2xl mr-3 flex-shrink-0">🌙</span>
                  <h4 className="text-lg font-semibold font-source text-gray-900 min-w-0">
                    {getMealLabel('dinner')}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('dinner')}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md flex-shrink-0"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {formData.dinner.map((item, index) => (
                  <div key={index} className="bg-white border-2 border-blue-200 rounded-xl p-4 relative shadow-sm hover:shadow-md transition-all duration-200">
                    {formData.dinner.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('dinner', index)}
                        className="absolute -left-2 -top-2 bg-white border-2 border-gray-300 rounded-full p-1.5 shadow-lg z-10 text-red-500 hover:text-red-700 hover:shadow-xl transition-all duration-200 flex-shrink-0"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('dinner', index, 'food', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('dinner', index, 'quantity', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              type="submit" 
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Symptom Entry
            </button>
          </div>
        </form>
      </div>

      {/* Symptoms List */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mt-12 min-w-0">
        <div className="flex items-center mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold font-source text-gray-900 min-w-0">Recent Entries</h2>
        </div>
        
        {symptoms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No entries yet</h3>
            <p className="text-gray-500 font-roboto">Start tracking your symptoms to identify patterns and triggers.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {symptoms.map((symptom) => (
              <div key={symptom.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 min-w-0">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600 font-roboto">
                        {new Date(symptom.symptomStartDate).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {symptom.isOngoing ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ongoing
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          to {new Date(symptom.symptomEndDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getSeverityColor(symptom.severity)}`}>
                        🔥 {symptom.severity}/10 - {getSeverityLabel(symptom.severity)}
                      </span>
                      {symptom.stress_level && (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStressColor(symptom.stress_level)}`}>
                          😰 {symptom.stress_level}/10 - {getStressLabel(symptom.stress_level)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSymptom(symptom.id)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Delete entry"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {symptom.notes && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start">
                      <span className="text-lg mr-2">📝</span>
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">Notes</p>
                        <p className="text-sm text-blue-700 font-roboto">{symptom.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display smoking status */}
                {symptom.smoking && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start">
                      <span className="text-lg mr-2">🚭</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-1">Smoking Status</p>
                        {symptom.smoking_details ? (
                          <p className="text-sm text-gray-700 font-roboto">{symptom.smoking_details}</p>
                        ) : (
                          <p className="text-sm text-gray-700 font-roboto">Yes</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display alcohol status */}
                {symptom.alcohol && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start">
                      <span className="text-lg mr-2">🍷</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-1">Alcohol Consumption</p>
                        {symptom.alcohol_units ? (
                          <p className="text-sm text-gray-700 font-roboto">{symptom.alcohol_units} per day</p>
                        ) : (
                          <p className="text-sm text-gray-700 font-roboto">Yes</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display meals if they exist */}
                {(symptom.breakfast?.length > 0 || symptom.lunch?.length > 0 || symptom.dinner?.length > 0) && (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">🍽️</span>
                      <p className="text-sm font-semibold text-gray-800">Meals Tracked</p>
                    </div>
                    
                    <div className="grid gap-3">
                      {symptom.breakfast?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center mb-2">
                            <span className="text-sm mr-2">🌅</span>
                            <p className="text-sm font-medium text-gray-800">Breakfast</p>
                          </div>
                          <ul className="text-sm text-gray-700 font-roboto space-y-1">
                            {symptom.breakfast.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                                {item.food}{item.quantity ? ` (${item.quantity})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {symptom.lunch?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center mb-2">
                            <span className="text-sm mr-2">☀️</span>
                            <p className="text-sm font-medium text-gray-800">Lunch</p>
                          </div>
                          <ul className="text-sm text-gray-700 font-roboto space-y-1">
                            {symptom.lunch.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                                {item.food}{item.quantity ? ` (${item.quantity})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {symptom.dinner?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center mb-2">
                            <span className="text-sm mr-2">🌙</span>
                            <p className="text-sm font-medium text-gray-800">Dinner</p>
                          </div>
                          <ul className="text-sm text-gray-700 font-roboto space-y-1">
                            {symptom.dinner.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                                {item.food}{item.quantity ? ` (${item.quantity})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback for old data format */}
                {symptom.foods && !symptom.breakfast && !symptom.lunch && !symptom.dinner && (
                  <div>
                    <p className="text-sm text-gray-700 font-roboto">
                      <span className="font-medium">Foods:</span> {symptom.foods}
                    </p>
                  </div>
                )}
              </div>
            ))}
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
