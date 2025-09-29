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
    stress_level: 3,
    notes: '',
    breakfast: [{ food: '', quantity: '' }],
    lunch: [{ food: '', quantity: '' }],
    dinner: [{ food: '', quantity: '' }],
    smoking: false,
    smoking_details: ''
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
      stress_level: 3,
      notes: '',
      breakfast: [{ food: '', quantity: '' }],
      lunch: [{ food: '', quantity: '' }],
      dinner: [{ food: '', quantity: '' }],
      smoking: false,
      smoking_details: ''
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
    if (severity <= 2) return 'Very Mild'
    if (severity <= 4) return 'Mild'
    if (severity <= 6) return 'Moderate'
    if (severity <= 8) return 'Severe'
    return 'Very Severe'
  }

  const getStressLabel = (stress) => {
    if (stress <= 2) return 'Very Low'
    if (stress <= 4) return 'Low'
    if (stress <= 6) return 'Moderate'
    if (stress <= 8) return 'High'
    return 'Very High'
  }

  const getStressColor = (stress) => {
    if (stress <= 2) return 'text-green-600 bg-green-100'
    if (stress <= 4) return 'text-blue-600 bg-blue-100'
    if (stress <= 6) return 'text-yellow-600 bg-yellow-100'
    if (stress <= 8) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }


  const getMealLabel = (mealType) => {
    const symptomDate = new Date(formData.symptomStartDate)
    const today = new Date()
    const isToday = symptomDate.toDateString() === today.toDateString()
    
    if (isToday) {
      return `What did you eat for ${mealType}?`
    } else {
      const dateStr = symptomDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      })
      return `What did you eat for ${mealType} on ${dateStr}?`
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Symptoms</h1>
            <p className="text-gray-600 font-roboto">
              Track your daily symptoms to identify patterns and triggers. Your data is stored locally on your device.
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

      {/* Symptom Logging Form */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Add New Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="symptomStartDate" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                When did symptoms begin?
              </label>
                      <DatePicker
                        id="symptomStartDate"
                        name="symptomStartDate"
                        value={formData.symptomStartDate}
                        onChange={(value) => setFormData(prev => ({ ...prev, symptomStartDate: value }))}
                        placeholder="Select start date"
                        className="w-full"
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
            </div>

            <div>
              <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                Are symptoms still ongoing?
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center font-roboto">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="true"
                    checked={formData.isOngoing === true}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center font-roboto">
                  <input
                    type="radio"
                    name="isOngoing"
                    value="false"
                    checked={formData.isOngoing === false}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

            {!formData.isOngoing && (
              <div>
                <label htmlFor="symptomEndDate" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                  When did symptoms end?
                </label>
                        <DatePicker
                          id="symptomEndDate"
                          name="symptomEndDate"
                          value={formData.symptomEndDate}
                          onChange={(value) => setFormData(prev => ({ ...prev, symptomEndDate: value }))}
                          placeholder="Select end date"
                          className="w-full"
                          minDate={formData.symptomStartDate}
                          maxDate={new Date().toISOString().split('T')[0]}
                        />
              </div>
            )}

          <div>
            <label htmlFor="severity" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Severity (1-10): {formData.severity}/10 ({getSeverityLabel(formData.severity)})
            </label>
            <input
              type="range"
              id="severity"
              name="severity"
              min="1"
              max="10"
              value={formData.severity}
              onChange={handleInputChange}
              className="slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 font-roboto">
              <span>1 (Very Mild)</span>
              <span>10 (Very Severe)</span>
            </div>
          </div>

          <div>
            <label htmlFor="stress_level" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Stress Level: {formData.stress_level}/10 ({getStressLabel(formData.stress_level)})
            </label>
            <input
              type="range"
              id="stress_level"
              name="stress_level"
              min="1"
              max="10"
              value={formData.stress_level}
              onChange={handleInputChange}
              className="slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 font-roboto">
              <span>1 (Very Low)</span>
              <span>10 (Very High)</span>
            </div>
          </div>

          {/* Smoking Status */}
          <div>
            <label className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Do you smoke?
            </label>
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="smoking"
                  value="true"
                  checked={formData.smoking === true}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center font-roboto">
                <input
                  type="radio"
                  name="smoking"
                  value="false"
                  checked={formData.smoking === false}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
            
            {formData.smoking && (
              <div className="ml-0 md:ml-6">
                <label htmlFor="smoking_details" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
                  Please describe your smoking habits (e.g., cigarettes, cigars, frequency, amount)
                </label>
                <input
                  type="text"
                  id="smoking_details"
                  name="smoking_details"
                  value={formData.smoking_details}
                  onChange={handleInputChange}
                  placeholder="e.g., 1 pack of cigarettes per day, occasional cigars, etc."
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="4"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Describe your symptoms, how you're feeling, any triggers you noticed..."
              className="input-field resize-none"
            />
          </div>

          {/* Meal Tracking */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold font-source text-gray-900">Meal Tracking</h3>
            
            {/* Breakfast */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  {getMealLabel('breakfast')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('breakfast')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.breakfast.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    {formData.breakfast.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('breakfast', index)}
                        className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('breakfast', index, 'food', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('breakfast', index, 'quantity', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lunch */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  {getMealLabel('lunch')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('lunch')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.lunch.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    {formData.lunch.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('lunch', index)}
                        className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('lunch', index, 'food', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('lunch', index, 'quantity', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dinner */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium font-roboto text-gray-700">
                  {getMealLabel('dinner')}
                </h4>
                <button
                  type="button"
                  onClick={() => addMealItem('dinner')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-roboto"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.dinner.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    {formData.dinner.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('dinner', index)}
                        className="absolute -left-2 -top-2 text-red-500 hover:text-red-700 bg-white border border-gray-200 rounded-full p-1 shadow-sm z-10"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Food item"
                          value={item.food}
                          onChange={(e) => updateMealItem('dinner', index, 'food', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('dinner', index, 'quantity', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary font-roboto w-full md:w-auto">
            Log Symptom Entry
          </button>
        </form>
      </div>

      {/* Symptoms List */}
      <div className="card mt-8 sm:mt-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Recent Entries</h2>
        
        {symptoms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-roboto">No symptom entries yet. Log your first entry above!</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {symptoms.map((symptom) => (
              <div key={symptom.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-500 font-roboto">
                      {new Date(symptom.symptomStartDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {symptom.isOngoing ? ' - Ongoing' : ` to ${new Date(symptom.symptomEndDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}`}
                    </span>
                    <span className={`text-center px-2 py-1 rounded-full text-xs font-medium font-roboto ${getSeverityColor(symptom.severity)}`}>
                      Symptom: {symptom.severity}/10 - {getSeverityLabel(symptom.severity)}
                    </span>
                    {symptom.stress_level && (
                      <span className={`text-center px-2 py-1 rounded-full text-xs font-medium font-roboto ${getStressColor(symptom.stress_level)}`}>
                        Stress: {symptom.stress_level}/10 - {getStressLabel(symptom.stress_level)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSymptom(symptom.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete entry"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {symptom.notes && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 font-roboto">
                      <span className="font-medium">Notes:</span> {symptom.notes}
                    </p>
                  </div>
                )}

                {/* Display smoking status */}
                {symptom.smoking && (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-roboto">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Smoking
                    </span>
                    {symptom.smoking_details && (
                      <div className="text-sm text-gray-600 font-roboto ml-2 mt-1">
                        {symptom.smoking_details}
                      </div>
                    )}
                  </div>
                )}

                {/* Display meals if they exist */}
                {(symptom.breakfast?.length > 0 || symptom.lunch?.length > 0 || symptom.dinner?.length > 0) && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 font-roboto mb-2">Meals:</p>
                    
                    {symptom.breakfast?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-600 font-roboto">Breakfast:</p>
                        <ul className="text-sm text-gray-600 font-roboto ml-2">
                          {symptom.breakfast.map((item, index) => (
                            <li key={index}>• {item.food}{item.quantity ? ` (${item.quantity})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {symptom.lunch?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-600 font-roboto">Lunch:</p>
                        <ul className="text-sm text-gray-600 font-roboto ml-2">
                          {symptom.lunch.map((item, index) => (
                            <li key={index}>• {item.food}{item.quantity ? ` (${item.quantity})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {symptom.dinner?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-600 font-roboto">Dinner:</p>
                        <ul className="text-sm text-gray-600 font-roboto ml-2">
                          {symptom.dinner.map((item, index) => (
                            <li key={index}>• {item.food}{item.quantity ? ` (${item.quantity})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
