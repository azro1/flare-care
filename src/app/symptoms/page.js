'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import ConfirmationModal from '@/components/ConfirmationModal'
import SyncSettings from '@/components/SyncSettings'
import DatePicker from '@/components/DatePicker'

export default function SymptomsPage() {
  const { data: symptoms, setData: setSymptoms, deleteData: deleteSymptom, syncEnabled, setSyncEnabled, isOnline, isSyncing, syncToCloud, fetchFromCloud } = useDataSync('flarecare-symptoms', [])
  const [formData, setFormData] = useState({
    symptomStartDate: new Date().toISOString().split('T')[0],
    isOngoing: true,
    symptomEndDate: '',
    severity: 5,
    notes: '',
    foods: ''
  })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.notes.trim() && !formData.foods.trim()) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Missing Information', 
        message: 'Please add some notes or foods to log this entry.' 
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

    const newSymptom = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString()
    }

    setSymptoms([newSymptom, ...symptoms])
    setFormData({
      symptomStartDate: new Date().toISOString().split('T')[0],
      isOngoing: true,
      symptomEndDate: '',
      severity: 5,
      notes: '',
      foods: ''
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-6 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">Symptoms</h1>
            <p className="text-gray-600">
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="symptomStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                When did symptoms begin?
              </label>
                      <DatePicker
                        id="symptomStartDate"
                        name="symptomStartDate"
                        value={formData.symptomStartDate}
                        onChange={(value) => setFormData(prev => ({ ...prev, symptomStartDate: value }))}
                        placeholder="Select start date"
                        className="w-full"
                      />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Are symptoms still ongoing?
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
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
                <label className="flex items-center">
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
                <label htmlFor="symptomEndDate" className="block text-sm font-medium text-gray-700 mb-2">
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
                        />
              </div>
            )}

          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
              Current Severity: {formData.severity}/10 ({getSeverityLabel(formData.severity)})
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
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 (Very Mild)</span>
              <span>10 (Very Severe)</span>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label htmlFor="foods" className="block text-sm font-medium text-gray-700 mb-2">
              Foods Eaten
            </label>
            <input
              type="text"
              id="foods"
              name="foods"
              value={formData.foods}
              onChange={handleInputChange}
              placeholder="List foods you ate today (comma-separated)"
              className="input-field"
            />
          </div>

          <button type="submit" className="btn-primary w-full md:w-auto">
            Log Symptom Entry
          </button>
        </form>
      </div>

      {/* Symptoms List */}
      <div className="card mt-8 sm:mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Entries</h2>
        
        {symptoms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No symptom entries yet. Log your first entry above!</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {symptoms.map((symptom) => (
              <div key={symptom.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {new Date(symptom.symptomStartDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {symptom.isOngoing ? ' - Ongoing' : ` to ${new Date(symptom.symptomEndDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}`}
                    </span>
                    <span className={`text-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(symptom.severity)}`}>
                      {symptom.severity}/10 - {getSeverityLabel(symptom.severity)}
                    </span>
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
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {symptom.notes}
                    </p>
                  </div>
                )}

                {symptom.foods && (
                  <div>
                    <p className="text-sm text-gray-700">
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
