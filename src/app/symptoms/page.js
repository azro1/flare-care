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
import { getUserPreferences, saveUserPreferences, updatePreference, checkHabitPattern } from '@/lib/userPreferences'
import { Thermometer } from 'lucide-react'

function SymptomsPageContent() {
  const { data: symptoms, setData: setSymptoms, deleteData: deleteSymptom } = useDataSync('flarecare-symptoms', [])
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  // Wizard state - initialize from localStorage if available
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('symptoms-wizard-step')
      return savedStep ? parseInt(savedStep) : 0
    }
    return 0
  })
  const [userPreferences, setUserPreferences] = useState(null)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [preferenceChangeModal, setPreferenceChangeModal] = useState({ isOpen: false, habit: '', oldValue: null, newValue: null })
  const [patternModal, setPatternModal] = useState({ isOpen: false, habit: '', consecutiveNo: 0 })
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFormData = localStorage.getItem('symptoms-wizard-form')
      return savedFormData ? JSON.parse(savedFormData) : {
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
      }
    }
    return {
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
    }
  })
  const [dateInputs, setDateInputs] = useState({
    day: '',
    month: '',
    year: '',
    endDay: '',
    endMonth: '',
    endYear: ''
  })

  // ✅ Prevent body scrolling only on landing page
  useEffect(() => {
    // Apply fixed positioning only on landing page (step 0)
    if (currentStep === 0) {
      // Freeze scroll
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
    
      // Apply gradient to html element since body is fixed
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.background = '#1a1d24'
      document.documentElement.style.height = '100%'
    } else {
      // Reset styles when on question pages
      document.body.style.position = 'static'
      document.body.style.width = 'auto'
      document.body.style.height = 'auto'
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.height = ''
    }
  
    // 🧹 Cleanup on unmount
    return () => {
      document.body.style.position = 'static'
      document.body.style.width = 'auto'
      document.body.style.height = 'auto'
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.height = ''
    }
  }, [currentStep])

  // Load user preferences on component mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const userId = user?.id
        const preferences = await getUserPreferences(userId)
        
        if (preferences) {
          setUserPreferences(preferences)
          setIsFirstTimeUser(false)
        } else {
          setUserPreferences(null)
          setIsFirstTimeUser(true)
        }
      } catch (error) {
        console.error('Error loading user preferences:', error)
        setUserPreferences(null)
        setIsFirstTimeUser(true)
      }
    }

    loadUserPreferences()
  }, [user?.id])

  // Persist current step to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('symptoms-wizard-step', currentStep.toString())
    }
  }, [currentStep])

  // Persist form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('symptoms-wizard-form', JSON.stringify(formData))
    }
  }, [formData])

  // Populate dateInputs from formData when navigating back to date steps
  useEffect(() => {
    // When on step 1 (start date), populate from formData.symptomStartDate
    if (currentStep === 1 && formData.symptomStartDate) {
      const date = new Date(formData.symptomStartDate)
      if (!isNaN(date.getTime())) {
        setDateInputs(prev => ({
          ...prev,
          day: date.getDate().toString(),
          month: (date.getMonth() + 1).toString(),
          year: date.getFullYear().toString()
        }))
      }
    }
    
    // When on step 3 (end date), populate from formData.symptomEndDate
    if (currentStep === 3 && formData.symptomEndDate) {
      const date = new Date(formData.symptomEndDate)
      if (!isNaN(date.getTime())) {
        setDateInputs(prev => ({
          ...prev,
          endDay: date.getDate().toString(),
          endMonth: (date.getMonth() + 1).toString(),
          endYear: date.getFullYear().toString()
        }))
      }
    }
  }, [currentStep, formData.symptomStartDate, formData.symptomEndDate])

  // Cleanup wizard state when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Clear wizard state when user navigates away from the page
      if (typeof window !== 'undefined') {
        localStorage.removeItem('symptoms-wizard-step')
        localStorage.removeItem('symptoms-wizard-form')
      }
    }
  }, [])
  
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

  const totalSteps = 18

  const prevStep = () => {
    
    // Smart back navigation for ALL skip scenarios
    
    // 1. If on severity (step 4) and symptoms are ongoing, go back to ongoing question (step 2)
    if (currentStep === 4 && formData.isOngoing === true) {
      setCurrentStep(2) // Go back to ongoing question
      return
    }
    
    // 2. If on smoking (step 9) and bathroom frequency is 0, go back to bathroom frequency (step 6)
    if (currentStep === 9 && parseInt(formData.normal_bathroom_frequency) === 0) {
      setCurrentStep(6) // Go back to bathroom frequency
      return
    }
    
    // 3. Smart navigation based on user preferences
    if (!isFirstTimeUser && userPreferences) {
      // If on meals (step 13) and user is non-smoker/non-drinker, go back to bathroom details (step 8) or bathroom change (step 7)
      if (currentStep === 13 && !userPreferences.isSmoker && !userPreferences.isDrinker) {
        // Go back to bathroom details if they filled it out, otherwise bathroom change question
        if (formData.bathroom_frequency_changed === 'yes' && formData.bathroom_frequency_change_details) {
          setCurrentStep(8) // Go back to bathroom details
        } else {
          setCurrentStep(7) // Go back to bathroom change question
        }
        return
      }
      // If on alcohol questions (step 11) and user is non-smoker, go back to bathroom details/change
      else if (currentStep === 11 && !userPreferences.isSmoker) {
        if (formData.bathroom_frequency_changed === 'yes' && formData.bathroom_frequency_change_details) {
          setCurrentStep(8) // Go back to bathroom details
        } else {
          setCurrentStep(7) // Go back to bathroom change question
        }
        return
      }
      // If on smoking details (step 10) and user is non-drinker, go back to smoking question (step 9)
      else if (currentStep === 10 && !userPreferences.isDrinker) {
        setCurrentStep(9) // Go back to smoking question
        return
      }
    }
    
    // 4. If on bathroom change question (step 7) and bathroom frequency is 0, go back to bathroom frequency (step 6)
    if (currentStep === 7 && parseInt(formData.normal_bathroom_frequency) === 0) {
      setCurrentStep(6) // Go back to bathroom frequency
      return
    }
    
    // 5. If on meals (step 13) and user answered "Yes" to alcohol, go back to alcohol details (step 12)
    if (currentStep === 13 && formData.alcohol === true && formData.alcohol_units) {
      setCurrentStep(12) // Go back to alcohol details
      return
    }
    
    // 6. If on meals (step 13) and user answered "No" to alcohol, go back to alcohol question (step 11)
    if (currentStep === 13 && formData.alcohol === false) {
      setCurrentStep(11) // Go back to alcohol question, skip alcohol details
      return
    }
    
    // 6. If on meals (step 13) and user answered "No" to smoking, go back to smoking question (step 9)
    if (currentStep === 13 && formData.smoking === false) {
      setCurrentStep(9) // Go back to smoking question, skip smoking details
      return
    }
    
    // 6. If on meals (step 13) and user is a smoker but not a drinker, go back to smoking details (step 10)
    if (currentStep === 13 && !isFirstTimeUser && userPreferences && userPreferences.isSmoker && !userPreferences.isDrinker) {
      setCurrentStep(10) // Go back to smoking details, skip alcohol question
      return
    }
    
    // 6. If on meals (step 13) and user answered "No" to alcohol, go back to alcohol question (step 11)
    if (currentStep === 13 && formData.alcohol === false) {
      setCurrentStep(11) // Go back to alcohol question
      return
    }
    
    // 7. If on bathroom change question (step 7) and user has baseline frequency, go back to stress level (step 5)
    if (currentStep === 7 && !isFirstTimeUser && userPreferences && userPreferences.normalBathroomFrequency) {
      setCurrentStep(5) // Go back to stress level, skip baseline question
      return
    }
    
    // 8. If on smoking (step 9) and user answered "No" to bathroom frequency change, go back to bathroom change question (step 7)
    if (currentStep === 9 && formData.bathroom_frequency_changed === 'no') {
      setCurrentStep(7) // Go back to bathroom change question
      return
    }
    
    // 7. If on alcohol (step 11) and user answered "No" to smoking, go back to smoking question (step 9)
    if (currentStep === 11 && formData.smoking === false) {
      setCurrentStep(9) // Go back to smoking question
      return
    }
    
    // 8. If on smoking (step 9) and bathroom frequency is 0, go back to bathroom frequency (step 6)
    if (currentStep === 9 && parseInt(formData.normal_bathroom_frequency) === 0) {
      setCurrentStep(6) // Go back to bathroom frequency
      return
    }
    
    // Default back navigation
    setCurrentStep(currentStep - 1)
  }

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
      // Use smart navigation to determine next step
      if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
        setCurrentStep(13) // Skip both smoking and alcohol questions if neither
        setFormData(prev => ({ ...prev, smoking: false, smoking_details: '', alcohol: false, alcohol_units: '' }))
      } else if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
        setCurrentStep(11) // Skip to alcohol questions if not a smoker
        setFormData(prev => ({ ...prev, smoking: false, smoking_details: '' }))
      } else {
        setCurrentStep(9) // Go to smoking questions
      }
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
      
      // Use smart navigation to determine next step after bathroom details
      if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
        setCurrentStep(13) // Skip both smoking and alcohol questions if neither
        setFormData(prev => ({ ...prev, smoking: false, smoking_details: '', alcohol: false, alcohol_units: '' }))
        return
      } else if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
        setCurrentStep(11) // Skip to alcohol questions if not a smoker
        setFormData(prev => ({ ...prev, smoking: false, smoking_details: '' }))
        return
      } else if (!isFirstTimeUser && userPreferences && userPreferences.isSmoker && !userPreferences.isDrinker) {
        setCurrentStep(9) // Go to smoking questions if smoker but not drinker
        return
      }
    }
    
    // Skip step 10 (smoking details) if they don't smoke
    if (currentStep === 9 && formData.smoking === false) {
      // Use smart navigation to determine next step
      if (!isFirstTimeUser && userPreferences && !userPreferences.isDrinker) {
        setCurrentStep(13) // Skip to meals if not a drinker
        setFormData(prev => ({ ...prev, alcohol: false, alcohol_units: '' }))
      } else {
        setCurrentStep(11) // Go to alcohol question
      }
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
      setCurrentStep(13) // Skip to step 13 (breakfast)
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
    
    // Validate step 13 (breakfast) - must have food or mark as skipped
    if (currentStep === 13) {
      const hasBreakfast = formData.breakfast.some(meal => meal.food.trim()) || formData.breakfast_skipped
      
      if (!hasBreakfast) {
        setFieldErrors(prev => ({ ...prev, breakfast: 'Please enter what you ate for breakfast or check "I didn\'t eat anything"' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, breakfast: '' }))
    }
    
    // Validate step 14 (lunch) - must have food or mark as skipped
    if (currentStep === 14) {
      const hasLunch = formData.lunch.some(meal => meal.food.trim()) || formData.lunch_skipped
      
      if (!hasLunch) {
        setFieldErrors(prev => ({ ...prev, lunch: 'Please enter what you ate for lunch or check "I didn\'t eat anything"' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, lunch: '' }))
    }
    
    // Validate step 15 (dinner) - must have food or mark as skipped
    if (currentStep === 15) {
      const hasDinner = formData.dinner.some(meal => meal.food.trim()) || formData.dinner_skipped
      
      if (!hasDinner) {
        setFieldErrors(prev => ({ ...prev, dinner: 'Please enter what you ate for dinner or check "I didn\'t eat anything"' }))
        return
      }
      // Clear error if validation passes
      setFieldErrors(prev => ({ ...prev, dinner: '' }))
    }
    
    // Move to next step if no validation issues
    if (currentStep < totalSteps) {
      let nextStepNumber = currentStep + 1
      
      // Smart navigation based on user preferences
      if (!isFirstTimeUser && userPreferences) {
        // Skip baseline bathroom frequency question if we already have it
        if (currentStep === 5 && userPreferences.normalBathroomFrequency) {
          nextStepNumber = 7 // Skip to change detection question
          // Set baseline data from preferences
          setFormData(prev => ({ ...prev, normal_bathroom_frequency: userPreferences.normalBathroomFrequency }))
        }
        // Skip smoking questions if user is not a smoker
        else if (currentStep === 9 && !userPreferences.isSmoker) {
          nextStepNumber = 11 // Skip to alcohol questions
          // Set smoking data to false
          setFormData(prev => ({ ...prev, smoking: false, smoking_details: '' }))
        }
        // Skip alcohol questions if user is not a drinker
        else if (currentStep === 11 && !userPreferences.isDrinker) {
          nextStepNumber = 13 // Skip to meal questions
          // Set alcohol data to false
          setFormData(prev => ({ ...prev, alcohol: false, alcohol_units: '' }))
        }
        // Skip alcohol questions if user is not a drinker (from smoking details)
        else if (currentStep === 10 && !userPreferences.isDrinker) {
          nextStepNumber = 13 // Skip to meal questions
          // Set alcohol data to false
          setFormData(prev => ({ ...prev, alcohol: false, alcohol_units: '' }))
        }
      }
      
      setCurrentStep(nextStepNumber)
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

    // Check for preference changes for returning users
    if (!isFirstTimeUser && userPreferences && (name === 'normal_bathroom_frequency')) {
      const currentPreference = userPreferences.normalBathroomFrequency
      const newValue = parseInt(value) || 0
      
      if (currentPreference !== newValue && value !== '') {
        setPreferenceChangeModal({
          isOpen: true,
          habit: name,
          oldValue: currentPreference,
          newValue: newValue
        })
      }
    }
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
      
      // Save user preferences if this is a first-time user
      if (isFirstTimeUser) {
        const userId = user?.id
        await saveUserPreferences(userId, {
          isSmoker: formData.smoking,
          isDrinker: formData.alcohol,
          normalBathroomFrequency: formData.normal_bathroom_frequency
        })
      } else {
        // Check for habit patterns for returning users
        const userId = user?.id
        const smokingPattern = await checkHabitPattern(userId, 'smoking', formData.smoking)
        const alcoholPattern = await checkHabitPattern(userId, 'alcohol', formData.alcohol)
        
        // Show pattern modal if detected
        if (smokingPattern.showModal) {
          setPatternModal({
            isOpen: true,
            habit: 'smoking',
            consecutiveNo: smokingPattern.consecutiveNo
          })
          setIsSubmitting(false)
          return // Don't redirect yet, wait for user response
        }
        
        if (alcoholPattern.showModal) {
          setPatternModal({
            isOpen: true,
            habit: 'alcohol',
            consecutiveNo: alcoholPattern.consecutiveNo
          })
          setIsSubmitting(false)
          return // Don't redirect yet, wait for user response
        }
      }
      
      // Set toast flag and redirect to homepage
      localStorage.setItem('showSymptomToast', 'true')
      // Clear wizard state
      localStorage.removeItem('symptoms-wizard-step')
      localStorage.removeItem('symptoms-wizard-form')
      router.push('/')
      
      setIsSubmitting(false)
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

  const handlePreferenceChangeConfirm = async () => {
    const { habit, newValue } = preferenceChangeModal
    const userId = user?.id
    
    let preferenceKey
    if (habit === 'smoking') {
      preferenceKey = 'isSmoker'
    } else if (habit === 'alcohol') {
      preferenceKey = 'isDrinker'
    } else if (habit === 'normal_bathroom_frequency') {
      preferenceKey = 'normalBathroomFrequency'
    }
    
    // Update the preference
    const updatedPrefs = {
      ...userPreferences,
      [preferenceKey]: newValue,
      lastUpdated: new Date().toISOString()
    }
    
    await saveUserPreferences(userId, updatedPrefs)
    setUserPreferences(updatedPrefs)
    setPreferenceChangeModal({ isOpen: false, habit: '', oldValue: null, newValue: null })
  }

  const handlePreferenceChangeCancel = () => {
    // Revert the form data to the original preference
    const { habit, oldValue } = preferenceChangeModal
    setFormData(prev => ({
      ...prev,
      [habit]: oldValue
    }))
    setPreferenceChangeModal({ isOpen: false, habit: '', oldValue: null, newValue: null })
  }

  const handlePatternModalConfirm = async () => {
    // User confirmed they've quit the habit
    const { habit } = patternModal
    const userId = user?.id
    const preferenceKey = habit === 'smoking' ? 'isSmoker' : 'isDrinker'
    
    // Update the preference to false (quit)
    const updatedPrefs = {
      ...userPreferences,
      [preferenceKey]: false,
      lastUpdated: new Date().toISOString()
    }
    
    await saveUserPreferences(userId, updatedPrefs)
    setUserPreferences(updatedPrefs)
    setPatternModal({ isOpen: false, habit: '', consecutiveNo: 0 })
    
    // Now redirect to homepage
    localStorage.setItem('showSymptomToast', 'true')
    // Clear wizard state
    localStorage.removeItem('symptoms-wizard-step')
    localStorage.removeItem('symptoms-wizard-form')
    router.push('/')
  }

  const handlePatternModalCancel = () => {
    // User said they haven't quit, just continue
    setPatternModal({ isOpen: false, habit: '', consecutiveNo: 0 })
    
    // Now redirect to homepage
    localStorage.setItem('showSymptomToast', 'true')
    // Clear wizard state
    localStorage.removeItem('symptoms-wizard-step')
    localStorage.removeItem('symptoms-wizard-form')
    router.push('/')
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
    setFormData(prev => {
      const updatedMeal = prev[mealType].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
      
      // If food item is being added and it's not empty, uncheck the "didn't eat anything" checkbox
      const skipField = `${mealType}_skipped`
      const shouldUncheckSkipped = field === 'food' && value.trim() !== '' && prev[skipField]
      
      return {
        ...prev,
        [mealType]: updatedMeal,
        ...(shouldUncheckSkipped && { [skipField]: false })
      }
    })
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
          <h1 className="text-base sm:text-lg font-regular text-muted mb-3">Log Symptoms</h1>
          <div className="border-b" style={{borderColor: 'var(--border-primary)'}}></div>
          </div>
      )}

      {/* Wizard Container */}
      <div className="mb-4">
        {/* Step 0: Landing Page */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-16 sm:pt-0">
            {/* Icon - same as home page symptoms card */}
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Thermometer className="w-8 h-8 text-emerald-600" />
          </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">Log Symptoms</h2>
            
            {/* Optional description */}
            <p className="text-lg sm:text-xl font-roboto text-muted mb-8 max-w-md">Track your daily symptoms to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="button-cadet px-4 py-2 text-lg font-semibold rounded-lg transition-colors"
            >
              Start now
            </button>
        </div>
        )}

        {/* Step 1: When did symptoms begin? */}
        {currentStep === 1 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">When did your symptoms begin?</h3>
            <p className="text-sm text-muted mb-6">For example, '14 09 2014'</p>
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-base font-medium text-secondary mb-2">Day</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              <div className="w-14">
                <label className="block text-base font-medium text-secondary mb-2">Month</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="w-24">
                <label className="block text-base font-medium text-secondary mb-2">Year</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            {(dateErrors.day || dateErrors.month || dateErrors.year) && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{dateErrors.day || dateErrors.month || dateErrors.year}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Are symptoms still ongoing? */}
        {currentStep === 2 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Are symptoms still ongoing?</h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="radio"
                      name="isOngoing"
                      value="true"
                      checked={formData.isOngoing === true}
                      onChange={handleInputChange}
                      className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                      style={{
                        accentColor: 'var(--text-cadet-blue)',
                        '--tw-accent-color': '#5F9EA0'
                      }}
                    />
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.isOngoing === true 
                        ? 'border-[var(--radio-border)] bg-white' 
                        : 'border-[var(--radio-border)] bg-white'
                    }`}>
                      {formData.isOngoing === true && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                      )}
                    </span>
                  </div>
                <span className="ml-3 text-lg text-secondary">Yes</span>
                </label>
              <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="radio"
                      name="isOngoing"
                      value="false"
                      checked={formData.isOngoing === false}
                      onChange={handleInputChange}
                      className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                      style={{
                        accentColor: 'var(--text-cadet-blue)',
                        '--tw-accent-color': '#5F9EA0'
                      }}
                    />
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.isOngoing === false 
                        ? 'border-[var(--radio-border)] bg-white' 
                        : 'border-[var(--radio-border)] bg-white'
                    }`}>
                      {formData.isOngoing === false && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                      )}
                    </span>
                  </div>
                <span className="ml-3 text-lg text-secondary">No</span>
                </label>
              </div>
            </div>
        )}

        {/* Step 3: When did symptoms end? (only if not ongoing) */}
        {currentStep === 3 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">When did symptoms end?</h3>
            <p className="text-sm text-muted mb-6">For example, '14 09 2014'</p>
            <div className="flex space-x-5">
              <div className="w-14">
                <label className="block text-base font-medium text-secondary mb-2">Day</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              <div className="w-14">
                <label className="block text-base font-medium text-secondary mb-2">Month</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
              <div className="w-24">
                <label className="block text-base font-medium text-secondary mb-2">Year</label>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            {(dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear) && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Symptom Severity */}
        {currentStep === 4 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
              {formData.isOngoing ? 'How severe are your symptoms?' : 'How severe were your symptoms?'}
            </h3>
            <p className="text-sm text-muted mb-6">Rate from 1 (mild) to 10 (severe)</p>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
                {fieldErrors.severity && (
                  <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.severity}</p>
              </div>
                )}
              </div>
        )}

        {/* Step 5: Stress Level */}
        {currentStep === 5 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
              {formData.isOngoing ? 'How stressed are you feeling?' : 'How stressed were you feeling during that time?'}
            </h3>
            <p className="text-sm text-muted mb-6">Rate from 1 (calm) to 10 (very stressed)</p>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                </div>
                {fieldErrors.stress_level && (
                  <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.stress_level}</p>
              </div>
                )}
              </div>
        )}

        {/* Step 6: Bathroom Frequency */}
        {currentStep === 6 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">How many times a day do you usually empty your bowels?</h3>
            <p className="text-sm text-muted mb-6">For example, '3' or '5'</p>

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
                className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
              {fieldErrors.normal_bathroom_frequency && (
                <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-red-600 text-sm">{fieldErrors.normal_bathroom_frequency}</p>
          </div>
              )}
            </div>
        )}

        {/* Step 7: Bathroom Frequency Change Question */}
        {currentStep === 7 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">
              {formData.isOngoing ? 'Have you noticed a change in bathroom frequency since symptoms started?' : 'Did you notice a change in bathroom frequency during that time?'}
            </h3>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="bathroom_frequency_changed"
                    value="yes"
                    checked={formData.bathroom_frequency_changed === 'yes'}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.bathroom_frequency_changed === 'yes' 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.bathroom_frequency_changed === 'yes' && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="bathroom_frequency_changed"
                    value="no"
                    checked={formData.bathroom_frequency_changed === 'no'}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.bathroom_frequency_changed === 'no' 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.bathroom_frequency_changed === 'no' && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 8: Bathroom Frequency Change Details */}
        {currentStep === 8 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">Describe your change</h3>
            <p className="text-sm text-muted mb-6">For example, 'increased to 8-10 times per day, blood present, mucus, loose stools'</p>
            <textarea
              id="bathroom_frequency_change_details"
              name="bathroom_frequency_change_details"
              rows="4"
              value={formData.bathroom_frequency_change_details}
              onChange={handleInputChange}
              className="w-full px-4 py-3 input-field-wizard resize-none"
            />
            {fieldErrors.bathroom_frequency_change_details && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{fieldErrors.bathroom_frequency_change_details}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 9: Smoking questions */}
        {currentStep === 9 && (
          <div className="mb-5">
            {isFirstTimeUser ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Do you smoke?</h3>
            ) : userPreferences?.isSmoker ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Did you smoke on {new Date(formData.symptomStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}?</h3>
            ) : (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Do you smoke?</h3>
            )}
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="smoking"
                    value="true"
                    checked={formData.smoking === true}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.smoking === true 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.smoking === true && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="smoking"
                    value="false"
                    checked={formData.smoking === false}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.smoking === false 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.smoking === false && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 10: Smoking details (only if they smoke) */}
        {currentStep === 10 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
              {isFirstTimeUser ? 'Please describe your smoking habits' : `How much did you smoke on ${new Date(formData.symptomStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}?`}
            </h3>
            <p className="text-sm text-muted mb-6">
              {isFirstTimeUser 
                ? "For example, '1 pack of cigarettes per day, occasional cigars'" 
                : "For example, '5 cigarettes' or '1 cigar'"
              }
            </p>
                <input
                  type="text"
                  id="smoking_details"
                  name="smoking_details"
                  value={formData.smoking_details}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 input-field-wizard"
                  autoComplete="off"
                />
                {fieldErrors.smoking_details && (
                  <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-red-600 text-sm">{fieldErrors.smoking_details}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 11: Alcohol questions */}
        {currentStep === 11 && (
          <div className="mb-5">
            {isFirstTimeUser ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Do you drink alcohol?</h3>
            ) : userPreferences?.isDrinker ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Did you drink alcohol on {new Date(formData.symptomStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}?</h3>
            ) : (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Do you drink alcohol?</h3>
            )}
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="alcohol"
                    value="true"
                    checked={formData.alcohol === true}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.alcohol === true 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.alcohol === true && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="alcohol"
                    value="false"
                    checked={formData.alcohol === false}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.alcohol === false 
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {formData.alcohol === false && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">No</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 12: Alcohol details (only if they drink) */}
        {currentStep === 12 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
              {!isFirstTimeUser && userPreferences?.isDrinker 
                ? `How many units of alcohol did you drink on ${new Date(formData.symptomStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}?` 
                : 'How many units of alcohol do you drink per day?'}
            </h3>
            <p className="text-sm text-muted mb-6">For example, '2' or '5'</p>
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
                  className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {fieldErrors.alcohol_units && (
                <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-red-600 text-sm">{fieldErrors.alcohol_units}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 13: Breakfast */}
        {currentStep === 13 && (
          <div className="mb-5">
            <div className="space-y-6">
            {/* Breakfast */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
                    {getMealLabel('breakfast')}
                  </h3>
                  </div>
                <button
                  type="button"
                  onClick={() => addMealItem('breakfast')}
                    disabled={formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')
                        ? 'button-disabled'
                        : 'bg-[#5F9EA0] text-white hover:bg-button-cadet-hover'
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
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200"
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
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('breakfast', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Breakfast skipped checkbox */}
              <div className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.breakfast_skipped}
                  onChange={(e) => {
                    const isChecked = e.target.checked
                    setFormData(prev => ({ 
                      ...prev, 
                      breakfast_skipped: isChecked,
                      // Clear breakfast items if "didn't eat anything" is checked
                      breakfast: isChecked ? [{ food: '', quantity: '' }] : prev.breakfast
                    }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for breakfast</span>
              </div>
            </div>
            </div>
            
            {/* Validation error message */}
            {fieldErrors.breakfast && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{fieldErrors.breakfast}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 14: Lunch */}
        {currentStep === 14 && (
          <div className="mb-5">
            <div className="space-y-6">
            {/* Lunch */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
                    {getMealLabel('lunch')}
                  </h3>
                  </div>
                <button
                  type="button"
                  onClick={() => addMealItem('lunch')}
                    disabled={formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')
                        ? 'button-disabled'
                        : 'bg-[#5F9EA0] text-white hover:bg-button-cadet-hover'
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
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200"
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
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('lunch', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Lunch skipped checkbox */}
              <div className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.lunch_skipped}
                  onChange={(e) => {
                    const isChecked = e.target.checked
                    setFormData(prev => ({ 
                      ...prev, 
                      lunch_skipped: isChecked,
                      // Clear lunch items if "didn't eat anything" is checked
                      lunch: isChecked ? [{ food: '', quantity: '' }] : prev.lunch
                    }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for lunch</span>
              </div>
            </div>
            </div>
            
            {/* Validation error message */}
            {fieldErrors.lunch && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{fieldErrors.lunch}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 15: Dinner */}
        {currentStep === 15 && (
          <div className="mb-5">
            <div className="space-y-6">
            {/* Dinner */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-2">
                    {getMealLabel('dinner')}
                  </h3>
                  </div>
                <button
                  type="button"
                  onClick={() => addMealItem('dinner')}
                    disabled={formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')
                        ? 'button-disabled'
                        : 'bg-[#5F9EA0] text-white hover:bg-button-cadet-hover'
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
                          className="absolute -left-2 -top-2 bg-red-500 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:bg-red-600 transition-all duration-200"
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
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateMealItem('dinner', index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 input-field-wizard"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dinner skipped checkbox */}
              <div className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.dinner_skipped}
                  onChange={(e) => {
                    const isChecked = e.target.checked
                    setFormData(prev => ({ 
                      ...prev, 
                      dinner_skipped: isChecked,
                      // Clear dinner items if "didn't eat anything" is checked
                      dinner: isChecked ? [{ food: '', quantity: '' }] : prev.dinner
                    }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for dinner</span>
              </div>
            </div>
            </div>
            
            {/* Validation error message */}
            {fieldErrors.dinner && (
              <div className="mt-6 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm">{fieldErrors.dinner}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 16: Additional Notes */}
        {currentStep === 16 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-semibold text-primary mb-6">Additional notes</h3>
            <p className="text-sm text-muted mb-4">Share any other details about your symptoms, how you're feeling, or triggers you noticed</p>            
            <div>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-3 input-field-wizard resize-none"
              />
                    </div>
                  </div>
        )}

        {/* Step 17: Review */}
        {currentStep === 17 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold font-source text-primary mb-8">
              Review your entry
            </h2>

            {/* Basic Information */}
            <div className="card p-6 rounded-xl border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-xl font-semibold text-cadet-blue mb-6 pb-4 border-b" style={{borderColor: 'var(--border-primary)'}}>Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Start Date</span>
                  <span className="font-medium text-primary">{formData.symptomStartDate ? new Date(formData.symptomStartDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Status</span>
                  <span className="font-medium text-primary">{formData.isOngoing ? 'Ongoing' : 'Ended'}</span>
                </div>
                {!formData.isOngoing && formData.symptomEndDate && (
                  <div>
                    <span className="text-sm text-cadet-blue block mb-1">End Date</span>
                    <span className="font-medium text-primary">{new Date(formData.symptomEndDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Severity</span>
                  <span className="font-medium text-primary">{formData.severity}/10</span>
                </div>
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Stress Level</span>
                  <span className="font-medium text-primary">{formData.stress_level}/10</span>
                </div>
              </div>
            </div>

            {/* Bathroom Frequency */}
            <div className="card p-6 rounded-xl border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-xl font-semibold text-cadet-blue mb-6 pb-4 border-b" style={{borderColor: 'var(--border-primary)'}}>Bathroom Frequency</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
                  <div>
                    <span className="text-sm text-cadet-blue block mb-1">Frequency</span>
                    <span className="font-medium text-primary">{formData.normal_bathroom_frequency || 'Not set'} times/day</span>
                  </div>
                  {formData.bathroom_frequency_changed && (
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Frequency Changed</span>
                      <span className="font-medium text-primary">{formData.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
                {formData.bathroom_frequency_changed === 'yes' && formData.bathroom_frequency_change_details && (
                  <div className="py-3 border-t" style={{borderColor: 'var(--border-primary)'}}>
                    <span className="text-sm text-cadet-blue block mb-1">Change Description</span>
                    <span className="font-medium text-primary">{formData.bathroom_frequency_change_details}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle - Only show if first-time user (they actually answered these questions) */}
            {isFirstTimeUser && (formData.smoking !== undefined || formData.alcohol !== undefined) && (
              <div className="card p-6 rounded-xl border" style={{borderColor: 'var(--border-card)'}}>
                <h3 className="text-xl font-semibold text-cadet-blue mb-6 pb-4 border-b" style={{borderColor: 'var(--border-primary)'}}>Lifestyle</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Smoking</span>
                      <span className="font-medium text-primary">{formData.smoking ? 'Yes' : 'No'}</span>
                    </div>
                    {formData.smoking && formData.smoking_details && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">Smoking Habits</span>
                        <span className="font-medium text-primary">{formData.smoking_details}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Alcohol</span>
                      <span className="font-medium text-primary">{formData.alcohol ? 'Yes' : 'No'}</span>
                    </div>
                    {formData.alcohol && formData.alcohol_units && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">Alcohol Units</span>
                        <span className="font-medium text-primary">{formData.alcohol_units} units/day</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Meals */}
            {(formData.breakfast.some(item => item.food.trim()) || 
              formData.lunch.some(item => item.food.trim()) || 
              formData.dinner.some(item => item.food.trim()) ||
              formData.breakfast_skipped || formData.lunch_skipped || formData.dinner_skipped) && (
              <div className="card p-6 rounded-xl border" style={{borderColor: 'var(--border-card)'}}>
                <h3 className="text-xl font-semibold text-cadet-blue mb-6 pb-4 border-b" style={{borderColor: 'var(--border-primary)'}}>Meals</h3>
                <div className="space-y-3">
                  {formData.breakfast.some(item => item.food.trim()) && (
                    <div className="py-3 border-b" style={{borderColor: 'var(--border-primary)'}}>
                      <span className="text-sm text-cadet-blue block mb-2">Breakfast</span>
                      <div className="space-y-1">
                        {formData.breakfast.filter(item => item.food.trim()).map((item, index) => (
                          <div key={index} className="font-medium text-primary">{item.food} ({item.quantity})</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.breakfast_skipped && (
                    <div className="py-3 border-b" style={{borderColor: 'var(--border-primary)'}}>
                      <span className="text-sm text-cadet-blue block mb-2">Breakfast</span>
                      <span className="font-medium text-primary italic">Didn't eat anything</span>
                    </div>
                  )}
                  {formData.lunch.some(item => item.food.trim()) && (
                    <div className="py-3 border-b" style={{borderColor: 'var(--border-primary)'}}>
                      <span className="text-sm text-cadet-blue block mb-2">Lunch</span>
                      <div className="space-y-1">
                        {formData.lunch.filter(item => item.food.trim()).map((item, index) => (
                          <div key={index} className="font-medium text-primary">{item.food} ({item.quantity})</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.lunch_skipped && (
                    <div className="py-3 border-b" style={{borderColor: 'var(--border-primary)'}}>
                      <span className="text-sm text-cadet-blue block mb-2">Lunch</span>
                      <span className="font-medium text-primary italic">Didn't eat anything</span>
                    </div>
                  )}
                  {formData.dinner.some(item => item.food.trim()) && (
                    <div className="py-3 border-b" style={{borderColor: 'var(--border-primary)'}}>
                      <span className="text-sm text-cadet-blue block mb-2">Dinner</span>
                      <div className="space-y-1">
                        {formData.dinner.filter(item => item.food.trim()).map((item, index) => (
                          <div key={index} className="font-medium text-primary">{item.food} ({item.quantity})</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.dinner_skipped && (
                    <div className="py-3">
                      <span className="text-sm text-cadet-blue block mb-2">Dinner</span>
                      <span className="font-medium text-primary italic">Didn't eat anything</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div className="card p-6 rounded-xl border" style={{borderColor: 'var(--border-card)'}}>
                <h3 className="text-xl font-semibold text-cadet-blue mb-6 pb-4 border-b" style={{borderColor: 'var(--border-primary)'}}>Notes</h3>
                <div className="py-3">
                  <p className="font-medium text-primary">{formData.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Separator for Review Page - only show if there are notes */}
        {currentStep === 17 && formData.notes && (
          <div className="my-8 border-t" style={{borderColor: 'var(--border-primary)'}}></div>
        )}

        {/* Navigation Buttons - Hide on landing page (step 0) */}
        {currentStep > 0 && (
          <div className={`flex justify-start items-center ${currentStep === 17 ? 'mt-8' : 'mt-6'}`}>
            {currentStep < 17 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-[#5F9EA0] text-white text-lg font-semibold rounded-lg hover:bg-button-cadet-hover transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#5F9EA0] text-white text-lg font-semibold rounded-lg hover:bg-button-cadet-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      <ConfirmationModal
        isOpen={preferenceChangeModal.isOpen}
        onClose={handlePreferenceChangeCancel}
        onConfirm={handlePreferenceChangeConfirm}
        title={`${preferenceChangeModal.habit === 'smoking' ? 'Smoking' : preferenceChangeModal.habit === 'alcohol' ? 'Alcohol' : 'Bathroom Frequency'} Habit Change`}
        message={`We noticed you ${preferenceChangeModal.habit === 'smoking' ? 'smoked' : preferenceChangeModal.habit === 'alcohol' ? 'drank alcohol' : `went to the bathroom ${preferenceChangeModal.newValue} times`} today. Have your ${preferenceChangeModal.habit === 'smoking' ? 'smoking' : preferenceChangeModal.habit === 'alcohol' ? 'drinking' : 'bathroom frequency'} habits changed?`}
        confirmText="Yes, update my profile"
        cancelText="No, just this once"
        isDestructive={false}
      />

      {/* Pattern Detection Modal */}
      <ConfirmationModal
        isOpen={patternModal.isOpen}
        onClose={handlePatternModalCancel}
        onConfirm={handlePatternModalConfirm}
        title={`${patternModal.habit === 'smoking' ? 'Smoking' : 'Drinking'} Pattern Detected`}
        message={`We've noticed you haven't ${patternModal.habit === 'smoking' ? 'smoked' : 'had a drink'} in your last ${patternModal.consecutiveNo} symptom entries. Have you stopped ${patternModal.habit === 'smoking' ? 'smoking' : 'drinking'}?`}
        confirmText="Yes, I've quit"
        cancelText="No, just tracking symptoms"
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
