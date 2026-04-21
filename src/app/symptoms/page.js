'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef, forwardRef, Fragment } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ProtectedRoute from '@/components/ProtectedRoute'
import { sanitizeNotes, sanitizeFoodTriggers } from '@/lib/sanitize'
import { supabase, TABLES, deleteFromSupabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { getUserPreferences, saveUserPreferences, updatePreference, checkHabitPattern } from '@/lib/userPreferences'
import { Thermometer, Calendar, ChevronRight, Loader2 } from 'lucide-react'

const SymptomDateInput = forwardRef(({ value, onClick, onChange, placeholder, id, className, onIconClick, ...rest }, ref) => (
  <div className={`symptom-date-input-wrapper flex items-center input-field-wizard ${className ?? ''}`.trim()}>
    <input
      ref={ref}
      readOnly
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      className="flex-1 min-w-0 !border-0 !p-0 !bg-transparent outline-none cursor-default text-inherit placeholder-slate-400"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.preventDefault()}
      style={{ caretColor: 'transparent' }}
      {...rest}
    />
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onIconClick?.() }}
      className="flex-shrink-0 p-0.5 cursor-pointer hover:opacity-80 transition-opacity ml-1"
      aria-label="Open date picker"
    >
      <Calendar className="w-5 h-5 text-secondary" />
    </button>
  </div>
))
SymptomDateInput.displayName = 'SymptomDateInput'

/** Logical sections for Log Symptoms (`firstStep` = breadcrumb jump target). */
const SYMPTOM_WIZARD_PHASES = [
  { id: 'timing', label: 'Duration', firstStep: 1, lastStep: 3 },
  { id: 'severity', label: 'Severity & stress', firstStep: 4, lastStep: 5 },
  { id: 'bathroom', label: 'Bathroom frequency', firstStep: 6, lastStep: 8 },
  { id: 'lifestyle', label: 'Lifestyle', firstStep: 9, lastStep: 12 },
  { id: 'meals', label: 'Meals', firstStep: 13, lastStep: 15 },
  { id: 'notes', label: 'Notes', firstStep: 16, lastStep: 16 },
  { id: 'review', label: 'Review', firstStep: 17, lastStep: 17 },
]

/** Returning non-smoker/non-drinker: wizard skips lifestyle (prefs already captured). */
function getSymptomWizardPhasesFiltered(isFirstTimeUser, userPreferences) {
  const phases = [...SYMPTOM_WIZARD_PHASES]
  if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
    return phases.filter((p) => p.id !== 'lifestyle')
  }
  return phases
}

function getSymptomWizardPhaseEntryStep(phase, isFirstTimeUser, userPreferences) {
  // Mirror skip behavior so breadcrumb back-jumps land on the same "section entry"
  // users would naturally hit in this flow.
  if (phase.id === 'bathroom' && !isFirstTimeUser && userPreferences?.normalBathroomFrequency) {
    return 7
  }
  if (phase.id === 'lifestyle' && !isFirstTimeUser && userPreferences) {
    if (!userPreferences.isSmoker && !userPreferences.isDrinker) return null
    if (!userPreferences.isSmoker) return 11
    return 9
  }
  return phase.firstStep
}

function getSymptomWizardPhaseProgress(currentStep, isFirstTimeUser, userPreferences) {
  const phases = getSymptomWizardPhasesFiltered(isFirstTimeUser, userPreferences)
  if (currentStep <= 0 || phases.length === 0) {
    return {
      phaseNames: [],
      phaseEntrySteps: [],
      currentPhaseLabel: '',
      sectionStep: 0,
      sectionTotal: 0,
    }
  }
  const idx = phases.findIndex((p) => currentStep >= p.firstStep && currentStep <= p.lastStep)
  if (idx < 0) {
    return {
      phaseNames: [],
      phaseEntrySteps: [],
      currentPhaseLabel: '',
      sectionStep: 0,
      sectionTotal: 0,
    }
  }
  return {
    phaseNames: phases.map((p) => p.label),
    phaseEntrySteps: phases.map((p) => getSymptomWizardPhaseEntryStep(p, isFirstTimeUser, userPreferences)),
    currentPhaseLabel: phases[idx].label,
    sectionStep: idx + 1,
    sectionTotal: phases.length,
  }
}

/** Band anchors for the five word options (still stored as 1–10 strings in formData). */
const WIZARD_RATING_BAND_VALUES = [2, 4, 6, 8, 10]

const SEVERITY_WORD_OPTIONS = [
  { label: 'Mild', value: 2 },
  { label: 'Slight', value: 4 },
  { label: 'Moderate', value: 6 },
  { label: 'Severe', value: 8 },
  { label: 'Extreme', value: 10 },
]

const STRESS_WORD_OPTIONS = [
  { label: 'Calm', value: 2 },
  { label: 'A little', value: 4 },
  { label: 'Moderate', value: 6 },
  { label: 'Stressed', value: 8 },
  { label: 'Very stressed', value: 10 },
]

/** Map any stored 1–10 value to the nearest band (so older precise entries still show one option selected). */
function wizardRatingToBand(value) {
  const v = Math.min(10, Math.max(1, Number(value) || 1))
  return WIZARD_RATING_BAND_VALUES[Math.min(4, Math.floor((v - 1) / 2))]
}

/** Selected chip style — cadet blue, same family as bowel Yes/No radios (`--text-cadet-blue`). */
const WIZARD_RATING_SELECTED_CHIP_STYLE = {
  borderColor: 'var(--text-cadet-blue)',
  backgroundColor: 'color-mix(in srgb, var(--text-cadet-blue) 18%, var(--bg-card-inner))',
}

function SymptomsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [symptoms, setSymptoms] = useState([])

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
      if (savedFormData) {
        const parsed = JSON.parse(savedFormData)
        return {
          ...parsed,
          smoker: typeof parsed.smoker === 'boolean' ? parsed.smoker : (typeof parsed.smoking === 'boolean' ? parsed.smoking : null),
          smoking_habits: parsed.smoking_habits ?? parsed.smoking_details ?? '',
          average_alcohol_units_pw: parsed.average_alcohol_units_pw ?? parsed.alcohol_habits ?? '',
        }
      }
      return {
        symptomStartDate: new Date().toISOString().split('T')[0],
        isOngoing: null,
        symptomEndDate: '',
        severity: '',
        stress_level: '',
        normal_bathroom_frequency: '',
        bathroom_frequency_changed: '',
        bathroom_frequency_change_details: '',
        notes: '',
        breakfast: [{ food: '', quantity: '' }],
        lunch: [{ food: '', quantity: '' }],
        dinner: [{ food: '', quantity: '' }],
        breakfast_skipped: false,
        lunch_skipped: false,
        dinner_skipped: false,
        smoker: null,
        smoking_habits: '',
        smoking_step10_phase: 'details',
        smoked_on_symptom_day: null,
        smoked_amount_on_symptom_day: '',
        alcohol: null,
        average_alcohol_units_pw: '',
        alcohol_step12_phase: 'baseline',
        drank_on_symptom_day: null,
        alcohol_units_on_symptom_day: ''
      }
    }
    return {
      symptomStartDate: '',
      isOngoing: null,
      symptomEndDate: '',
      severity: '',
      stress_level: '',
      normal_bathroom_frequency: '',
      bathroom_frequency_changed: '',
      bathroom_frequency_change_details: '',
      notes: '',
      breakfast: [{ food: '', quantity: '' }],
      lunch: [{ food: '', quantity: '' }],
      dinner: [{ food: '', quantity: '' }],
      breakfast_skipped: false,
      lunch_skipped: false,
      dinner_skipped: false,
      smoker: null,
      smoking_habits: '',
      smoking_step10_phase: 'details',
      smoked_on_symptom_day: null,
      smoked_amount_on_symptom_day: '',
      alcohol: null,
      average_alcohol_units_pw: '',
      alcohol_step12_phase: 'baseline',
      drank_on_symptom_day: null,
      alcohol_units_on_symptom_day: ''
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

  // Mobile only + landing (step 0): freeze body scroll (matches Tailwind `sm` 640px). Desktop or step > 0: normal scroll.
  useEffect(() => {
    const SM_PX = 640

    const syncBodyScrollLock = () => {
      const isDesktop = window.matchMedia(`(min-width: ${SM_PX}px)`).matches

      if (currentStep !== 0) {
        document.body.style.position = 'static'
        document.body.style.width = 'auto'
        document.body.style.height = 'auto'
        document.body.style.backgroundColor = ''
        document.documentElement.style.background = ''
        document.documentElement.style.height = ''
        return
      }

      if (isDesktop) {
        document.body.style.position = 'static'
        document.body.style.width = 'auto'
        document.body.style.height = 'auto'
        document.body.style.backgroundColor = ''
        document.documentElement.style.background = ''
        document.documentElement.style.height = ''
      } else {
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        document.body.style.height = '100%'
        const bgMain = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim()
        document.body.style.backgroundColor = 'transparent'
        document.documentElement.style.background = bgMain || '#f8fafc'
        document.documentElement.style.height = '100%'
      }
    }

    syncBodyScrollLock()
    const mql = window.matchMedia(`(min-width: ${SM_PX}px)`)
    mql.addEventListener('change', syncBodyScrollLock)

    return () => {
      mql.removeEventListener('change', syncBodyScrollLock)
      document.body.style.position = 'static'
      document.body.style.width = 'auto'
      document.body.style.height = 'auto'
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.height = ''
    }
  }, [currentStep])

  // Fetch symptoms directly from Supabase
  useEffect(() => {
    const fetchSymptoms = async () => {
      if (!user?.id) {
        setSymptoms([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.LOG_SYMPTOMS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          // Transform snake_case to camelCase
          const transformedSymptoms = data.map(item => {
            const {
              symptom_start_date,
              is_ongoing,
              symptom_end_date,
              smoker,
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              smoker: typeof smoker === 'boolean' ? smoker : false,
              symptomStartDate: symptom_start_date,
              isOngoing: is_ongoing,
              symptomEndDate: symptom_end_date,
              createdAt: created_at,
              created_at: created_at, // Keep both for compatibility
              updatedAt: updated_at
            }
          })
          setSymptoms(transformedSymptoms)
        }
      } catch (error) {
        console.error('Error fetching symptoms:', error)
        setSymptoms([])
      }
    }

    fetchSymptoms()
  }, [user?.id])

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

  // Default symptom start date to today when empty (runs on client mount)
  useEffect(() => {
    if (typeof window !== 'undefined' && !formData.symptomStartDate) {
      setFormData(prev => ({ ...prev, symptomStartDate: new Date().toISOString().split('T')[0] }))
    }
  }, [])

  // Default symptom end date to today when reaching step 3 and empty
  useEffect(() => {
    if (currentStep === 3 && !formData.symptomEndDate) {
      setFormData(prev => ({ ...prev, symptomEndDate: new Date().toISOString().split('T')[0] }))
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
    
  }, [currentStep, formData.symptomStartDate])

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

  const datePickerRef = useRef(null)
  const datePickerEndRef = useRef(null)
  const phaseBreadcrumbNavRef = useRef(null)

  const [dateErrors, setDateErrors] = useState({
    day: '',
    month: '',
    year: '',
    endDay: '',
    endMonth: '',
    endYear: ''
  })

  const [fieldErrors, setFieldErrors] = useState({
    isOngoing: '',
    bathroom_frequency_changed: '',
    smoker: '',
    alcohol: '',
    bathroom_frequency_change_details: '',
    smoking_habits: '',
    smoked_on_symptom_day: '',
    smoked_amount_on_symptom_day: '',
    severity: '',
    stress_level: '',
    normal_bathroom_frequency: '',
    average_alcohol_units_pw: '',
    drank_on_symptom_day: '',
    alcohol_units_on_symptom_day: ''
  })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = 18

  const symptomWizardPhaseProgress = useMemo(
    () => getSymptomWizardPhaseProgress(currentStep, isFirstTimeUser, userPreferences),
    [currentStep, isFirstTimeUser, userPreferences]
  )

  const symptomDayDate = formData.symptomStartDate ? new Date(`${formData.symptomStartDate}T12:00:00`) : null
  const hasValidSymptomDay = Boolean(symptomDayDate && !Number.isNaN(symptomDayDate.getTime()))
  const isSymptomDayToday =
    hasValidSymptomDay && symptomDayDate.toDateString() === new Date().toDateString()
  const isSymptomDayThisYear =
    hasValidSymptomDay && symptomDayDate.getFullYear() === new Date().getFullYear()
  const symptomDayLabel = hasValidSymptomDay
    ? symptomDayDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(isSymptomDayThisYear ? {} : { year: 'numeric' }),
      })
    : 'this day'
  // Resolve sub-step phase from persisted answers to avoid brief reload flicker.
  const smokingStep10Phase = formData.smoking_step10_phase ||
    (formData.smoked_on_symptom_day === true && formData.smoked_amount_on_symptom_day?.trim()
      ? 'dayAmount'
      : typeof formData.smoked_on_symptom_day === 'boolean'
        ? 'dayYesNo'
        : formData.smoking_habits?.trim()
          ? 'dayYesNo'
          : 'details')
  const alcoholStep12Phase = formData.alcohol_step12_phase ||
    (formData.drank_on_symptom_day === true && String(formData.alcohol_units_on_symptom_day || '').trim()
      ? 'dayAmount'
      : typeof formData.drank_on_symptom_day === 'boolean'
        ? 'dayYesNo'
        : String(formData.average_alcohol_units_pw || '').trim()
          ? 'dayYesNo'
          : 'baseline')

  // Below md: horizontal scroll row — keep the active section chip in view.
  useLayoutEffect(() => {
    if (currentStep <= 0) return
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
    const nav = phaseBreadcrumbNavRef.current
    if (!nav) return
    const current = nav.querySelector('button[aria-current="step"]')
    if (current instanceof HTMLElement) {
      current.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'instant' })
    }
  }, [currentStep, symptomWizardPhaseProgress.currentPhaseLabel])

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      // Check if date is selected (react-datepicker)
      if (!formData.symptomStartDate) {
        setDateErrors({
          day: 'Please select the date your symptoms began',
          month: '',
          year: ''
        })
        return
      }
      // Clear any existing errors since validation passed
      setDateErrors({ day: '', month: '', year: '', endDay: '', endMonth: '', endYear: '' })
    }
    
    // Validate step 3 (end date) if symptoms are not ongoing
    if (currentStep === 2 && typeof formData.isOngoing !== 'boolean') {
      setFieldErrors(prev => ({ ...prev, isOngoing: 'Please tell us if your symptoms are ongoing' }))
      return
    }
    if (currentStep === 2) {
      setFieldErrors(prev => ({ ...prev, isOngoing: '' }))
    }

    if (currentStep === 3) {
      if (!formData.symptomEndDate) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Please select the date your symptoms ended',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      const testEndDate = new Date(formData.symptomEndDate + 'T12:00:00')
      if (isNaN(testEndDate.getTime())) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Please select a valid date',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      // End date cannot be in the future (DatePicker has maxDate but double-check)
      if (testEndDate > new Date()) {
        setDateErrors(prev => ({
          ...prev,
          endDay: 'Date cannot be in the future',
          endMonth: '',
          endYear: ''
        }))
        return
      }
      
      // Clear any existing errors since validation passed
      setDateErrors({ day: '', month: '', year: '', endDay: '', endMonth: '', endYear: '' })
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
    if (currentStep === 7 && formData.bathroom_frequency_changed !== 'yes' && formData.bathroom_frequency_changed !== 'no') {
      setFieldErrors(prev => ({ ...prev, bathroom_frequency_changed: 'Please tell us if your bathroom frequency changed' }))
      return
    }
    if (currentStep === 7) {
      setFieldErrors(prev => ({ ...prev, bathroom_frequency_changed: '' }))
    }

    if (currentStep === 7 && formData.bathroom_frequency_changed === 'no') {
      // Use smart navigation to determine next step
      if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
        setCurrentStep(13) // Skip both smoking and alcohol questions if neither
        setFormData(prev => ({ ...prev, smoker: false, smoking_habits: '', alcohol: false, average_alcohol_units_pw: '' }))
      } else if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
        setCurrentStep(11) // Skip to alcohol questions if not a smoker
        setFormData(prev => ({ ...prev, smoker: false, smoking_habits: '' }))
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
        setFormData(prev => ({ ...prev, smoker: false, smoking_habits: '', alcohol: false, average_alcohol_units_pw: '' }))
        return
      } else if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
        setCurrentStep(11) // Skip to alcohol questions if not a smoker
        setFormData(prev => ({ ...prev, smoker: false, smoking_habits: '' }))
        return
      } else if (!isFirstTimeUser && userPreferences && userPreferences.isSmoker && !userPreferences.isDrinker) {
        setCurrentStep(9) // Go to smoking questions if smoker but not drinker
        return
      }
    }

    // Returning users with smoker preference must answer symptom-day smoking yes/no.
    if (currentStep === 9 && !isFirstTimeUser && userPreferences?.isSmoker) {
      if (typeof formData.smoked_on_symptom_day !== 'boolean') {
        setFieldErrors(prev => ({ ...prev, smoked_on_symptom_day: 'Please answer Yes or No' }))
        return
      }
      setFieldErrors(prev => ({ ...prev, smoked_on_symptom_day: '' }))
    }

    if (currentStep === 9 && isFirstTimeUser && typeof formData.smoker !== 'boolean') {
      setFieldErrors(prev => ({ ...prev, smoker: 'Please answer Yes or No' }))
      return
    }
    if (currentStep === 9 && isFirstTimeUser) {
      setFieldErrors(prev => ({ ...prev, smoker: '' }))
    }
    
    // Skip step 10 if they did not smoke on symptom day (returning smoker),
    // or if they are not a smoker (first-time flow).
    if (
      currentStep === 9 &&
      (
        (!isFirstTimeUser && userPreferences?.isSmoker && formData.smoked_on_symptom_day === false) ||
        ((isFirstTimeUser || !userPreferences?.isSmoker) && formData.smoker === false)
      )
    ) {
      // Use smart navigation to determine next step
      if (!isFirstTimeUser && userPreferences && !userPreferences.isDrinker) {
        setCurrentStep(13) // Skip to meals if not a drinker
        setFormData(prev => ({ ...prev, alcohol: false, average_alcohol_units_pw: '' }))
      } else {
        setCurrentStep(11) // Go to alcohol question
      }
      return
    }
    
    // Validate step 10 (smoking habits/day amount) - must be filled if they smoke
    if (currentStep === 10) {
      if (isFirstTimeUser && formData.smoker === true) {
        if (!formData.smoking_habits || formData.smoking_habits.trim() === '') {
          setFieldErrors(prev => ({ ...prev, smoking_habits: 'Please describe your smoking habits' }))
          return
        }
        // Clear smoking habits error once baseline habits are valid.
        setFieldErrors(prev => ({ ...prev, smoking_habits: '' }))

        if (smokingStep10Phase === 'details') {
          setFormData(prev => ({ ...prev, smoking_step10_phase: 'dayYesNo' }))
          return
        }
        if (smokingStep10Phase === 'dayYesNo') {
          if (typeof formData.smoked_on_symptom_day !== 'boolean') {
            setFieldErrors(prev => ({ ...prev, smoked_on_symptom_day: 'Please answer Yes or No' }))
            return
          }
          setFieldErrors(prev => ({ ...prev, smoked_on_symptom_day: '' }))
          if (formData.smoked_on_symptom_day) {
            setFormData(prev => ({ ...prev, smoking_step10_phase: 'dayAmount' }))
            return
          }
        }
        if (smokingStep10Phase === 'dayAmount' && (!formData.smoked_amount_on_symptom_day || formData.smoked_amount_on_symptom_day.trim() === '')) {
          setFieldErrors(prev => ({ ...prev, smoked_amount_on_symptom_day: 'Please describe how much you smoked on this symptom day' }))
          return
        }
        setFieldErrors(prev => ({ ...prev, smoked_amount_on_symptom_day: '' }))
      } else if (!isFirstTimeUser) {
        if (!formData.smoked_amount_on_symptom_day || formData.smoked_amount_on_symptom_day.trim() === '') {
          setFieldErrors(prev => ({ ...prev, smoked_amount_on_symptom_day: 'Please describe how much you smoked on this symptom day' }))
          return
        }
        setFieldErrors(prev => ({ ...prev, smoked_amount_on_symptom_day: '' }))
      }
    }

    // Returning users with drinker preference must answer symptom-day alcohol yes/no.
    if (currentStep === 11 && !isFirstTimeUser && userPreferences?.isDrinker) {
      if (typeof formData.drank_on_symptom_day !== 'boolean') {
        setFieldErrors(prev => ({ ...prev, drank_on_symptom_day: 'Please answer Yes or No' }))
        return
      }
      setFieldErrors(prev => ({ ...prev, drank_on_symptom_day: '' }))
    }

    if (currentStep === 11 && isFirstTimeUser && typeof formData.alcohol !== 'boolean') {
      setFieldErrors(prev => ({ ...prev, alcohol: 'Please answer Yes or No' }))
      return
    }
    if (currentStep === 11 && isFirstTimeUser) {
      setFieldErrors(prev => ({ ...prev, alcohol: '' }))
    }
    
    // Skip step 12 if they did not drink on symptom day (returning drinker),
    // or if they are not a drinker (first-time flow).
    if (
      currentStep === 11 &&
      (
        (!isFirstTimeUser && userPreferences?.isDrinker && formData.drank_on_symptom_day === false) ||
        ((isFirstTimeUser || !userPreferences?.isDrinker) && formData.alcohol === false)
      )
    ) {
      setCurrentStep(13) // Skip to step 13 (breakfast)
      return
    }
    
    // Validate step 12 (alcohol units/day units) - must be filled if they drink
    if (currentStep === 12) {
      if (isFirstTimeUser && formData.alcohol === true) {
        if (!formData.average_alcohol_units_pw || formData.average_alcohol_units_pw === '') {
          setFieldErrors(prev => ({ ...prev, average_alcohol_units_pw: 'Please enter how many units of alcohol you drink per week' }))
          return
        }
        // Clear error if validation passes
        setFieldErrors(prev => ({ ...prev, average_alcohol_units_pw: '' }))

        if (alcoholStep12Phase === 'baseline') {
          setFormData(prev => ({ ...prev, alcohol_step12_phase: 'dayYesNo' }))
          return
        }
        if (alcoholStep12Phase === 'dayYesNo') {
          if (typeof formData.drank_on_symptom_day !== 'boolean') {
            setFieldErrors(prev => ({ ...prev, drank_on_symptom_day: 'Please answer Yes or No' }))
            return
          }
          setFieldErrors(prev => ({ ...prev, drank_on_symptom_day: '' }))
          if (formData.drank_on_symptom_day) {
            setFormData(prev => ({ ...prev, alcohol_step12_phase: 'dayAmount' }))
            return
          }
        }
        if (alcoholStep12Phase === 'dayAmount' && (!formData.alcohol_units_on_symptom_day || formData.alcohol_units_on_symptom_day === '')) {
          setFieldErrors(prev => ({ ...prev, alcohol_units_on_symptom_day: 'Please enter how many units you drank on this symptom day' }))
          return
        }
        setFieldErrors(prev => ({ ...prev, alcohol_units_on_symptom_day: '' }))
      } else if (!isFirstTimeUser) {
        if (!formData.alcohol_units_on_symptom_day || formData.alcohol_units_on_symptom_day === '') {
          setFieldErrors(prev => ({ ...prev, alcohol_units_on_symptom_day: 'Please enter how many units you drank on this symptom day' }))
          return
        }
        setFieldErrors(prev => ({ ...prev, alcohol_units_on_symptom_day: '' }))
      }
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
          setFormData(prev => ({ ...prev, smoker: false, smoking_habits: '' }))
        }
        // Skip alcohol questions if user is not a drinker
        else if (currentStep === 11 && !userPreferences.isDrinker) {
          nextStepNumber = 13 // Skip to meal questions
          // Set alcohol data to false
          setFormData(prev => ({ ...prev, alcohol: false, average_alcohol_units_pw: '' }))
        }
        // Skip alcohol questions if user is not a drinker (from smoking habits)
        else if (currentStep === 10 && !userPreferences.isDrinker) {
          nextStepNumber = 13 // Skip to meal questions
          // Set alcohol data to false
          setFormData(prev => ({ ...prev, alcohol: false, average_alcohol_units_pw: '' }))
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
      
      // Alcohol units: 0-30, allow decimals (e.g. 0.2, 0.5)
      if (name === 'average_alcohol_units_pw' || name === 'alcohol_units_on_symptom_day') {
        if (value && value.length > 5) {
          return // e.g. "99.99" max length
        }
        const floatVal = parseFloat(value)
        if (value && (isNaN(floatVal) || floatVal < 0 || floatVal > 30)) {
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

      if (name === 'smoker' && newData.smoker === false) {
        newData.smoking_habits = ''
        newData.smoking_step10_phase = 'details'
        newData.smoked_on_symptom_day = null
        newData.smoked_amount_on_symptom_day = ''
        setFieldErrors(prev => ({ ...prev, smoking_habits: '', smoked_on_symptom_day: '', smoked_amount_on_symptom_day: '' }))
      }

      if (name === 'smoked_on_symptom_day' && newData.smoked_on_symptom_day === false) {
        newData.smoking_step10_phase = 'dayYesNo'
        newData.smoked_amount_on_symptom_day = ''
        setFieldErrors(prev => ({ ...prev, smoked_amount_on_symptom_day: '' }))
      }

      if (name === 'alcohol' && newData.alcohol === false) {
        newData.average_alcohol_units_pw = ''
        newData.alcohol_step12_phase = 'baseline'
        newData.drank_on_symptom_day = null
        newData.alcohol_units_on_symptom_day = ''
        setFieldErrors(prev => ({ ...prev, average_alcohol_units_pw: '', drank_on_symptom_day: '', alcohol_units_on_symptom_day: '' }))
      }

      if (name === 'drank_on_symptom_day' && newData.drank_on_symptom_day === false) {
        newData.alcohol_step12_phase = 'dayYesNo'
        newData.alcohol_units_on_symptom_day = ''
        setFieldErrors(prev => ({ ...prev, alcohol_units_on_symptom_day: '' }))
      }
      
      // Clear field errors when user starts typing
      if (name === 'isOngoing' || name === 'bathroom_frequency_changed' || name === 'smoker' || name === 'alcohol' || name === 'bathroom_frequency_change_details' || name === 'smoking_habits' || name === 'smoked_on_symptom_day' || name === 'smoked_amount_on_symptom_day' || name === 'severity' || name === 'stress_level' || name === 'normal_bathroom_frequency' || name === 'average_alcohol_units_pw' || name === 'drank_on_symptom_day' || name === 'alcohol_units_on_symptom_day') {
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

  const setWizardRating = (name, value) => {
    if (value < 1 || value > 10) return
    setFormData((prev) => ({ ...prev, [name]: String(value) }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
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
      smoker: isFirstTimeUser ? formData.smoker : null,
      smoking_habits: isFirstTimeUser ? formData.smoking_habits : null,
      smoked_on_symptom_day: typeof formData.smoked_on_symptom_day === 'boolean' ? formData.smoked_on_symptom_day : false,
      smoked_amount_on_symptom_day: formData.smoked_amount_on_symptom_day || null,
      alcohol: isFirstTimeUser ? formData.alcohol : null,
      average_alcohol_units_pw: isFirstTimeUser ? formData.average_alcohol_units_pw : null,
      drank_on_symptom_day: typeof formData.drank_on_symptom_day === 'boolean' ? formData.drank_on_symptom_day : false,
      alcohol_units_on_symptom_day: formData.alcohol_units_on_symptom_day || null,
      notes: sanitizeNotes(formData.notes),
      ...sanitizedMeals,
      created_at: new Date().toISOString()
    }

    try {
      // Save to Supabase
      const { error } = await supabase
        .from(TABLES.LOG_SYMPTOMS)
        .insert([newSymptom])

      if (error) throw error

      // Transform and update local state
      const transformedSymptom = {
        ...newSymptom,
        symptomStartDate: newSymptom.symptom_start_date,
        isOngoing: newSymptom.is_ongoing,
        symptomEndDate: newSymptom.symptom_end_date,
        createdAt: newSymptom.created_at,
        created_at: newSymptom.created_at, // Keep both for compatibility
        updatedAt: newSymptom.updated_at || newSymptom.created_at
      }
      setSymptoms([transformedSymptom, ...symptoms])
      
      // Save user preferences if this is a first-time user
      if (isFirstTimeUser) {
        const userId = user?.id
        await saveUserPreferences(userId, {
          isSmoker: formData.smoker,
          isDrinker: formData.alcohol,
          normalBathroomFrequency: formData.normal_bathroom_frequency
        })
      } else {
        // Check for habit patterns for returning users
        const userId = user?.id
        const smokingPattern = await checkHabitPattern(userId, 'smoking', formData.smoked_on_symptom_day)
        const alcoholPattern = await checkHabitPattern(userId, 'alcohol', formData.drank_on_symptom_day)
        
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
    if (deleteModal.id && user?.id) {
      try {
        const result = await deleteFromSupabase(TABLES.LOG_SYMPTOMS, deleteModal.id, user.id)
        
        if (result.success) {
          // Remove from local state
          setSymptoms(symptoms.filter(s => s.id !== deleteModal.id))
          setDeleteModal({ isOpen: false, id: null })
        } else {
          console.error('Error deleting symptom:', result.error)
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete symptom. Please try again.'
          })
        }
      } catch (error) {
        console.error('Error deleting symptom:', error)
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Failed to delete symptom. Please try again.'
        })
      }
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

  const getMealLabel = (mealType) => {
    if (!formData.symptomStartDate) {
      return `What did you have for ${mealType}?`
    }
    if (isSymptomDayToday) {
      return `What did you have for ${mealType} today?`
    }
    const symptomDate = new Date(`${formData.symptomStartDate}T12:00:00`)
    const dateStr = symptomDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
    return `What did you have for ${mealType} on ${dateStr}?`
  }

  const addMealItem = (mealType) => {
    setFormData(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], { food: '', quantity: '' }]
    }))
    setFieldErrors(prev => ({ ...prev, [mealType]: '' }))
  }

  const removeMealItem = (mealType, index) => {
    setFormData(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index)
    }))
    setFieldErrors(prev => ({ ...prev, [mealType]: '' }))
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
    setFieldErrors(prev => ({ ...prev, [mealType]: '' }))
  }

  const wizardPhaseNames = symptomWizardPhaseProgress.phaseNames

  return (
    <div className={`symptoms-wizard max-w-4xl w-full mx-auto min-w-0 flex flex-col justify-center sm:min-h-[500px] ${
      currentStep > 0
        ? currentStep === 17
          ? 'pb-28 lg:pb-10'
          : 'pb-28 lg:pb-0'
        : ''
    }`}>
      {/* Header: exit + section breadcrumb — hide on landing */}
      {currentStep > 0 && (
        <div className="min-w-0 w-full max-w-full pt-0 mb-6 md:mb-8">
          <button
            type="button"
            onClick={() => setCurrentStep(0)}
            className="text-sm sm:text-base font-normal text-primary underline hover:opacity-80 transition-opacity text-left"
          >
            Log Symptoms
          </button>

          {symptomWizardPhaseProgress.sectionTotal > 0 && (
            <div className="mt-6 w-full min-w-0 max-w-full">
              <span id="symptom-wizard-step-status" className="sr-only">
                Section {symptomWizardPhaseProgress.sectionStep} of {symptomWizardPhaseProgress.sectionTotal}. Current
                section: {symptomWizardPhaseProgress.currentPhaseLabel}.
              </span>
              <nav
                ref={phaseBreadcrumbNavRef}
                aria-describedby="symptom-wizard-step-status"
                className={[
                  'flex w-full min-w-0 max-w-full items-center gap-x-1 gap-y-1 text-sm sm:text-base leading-snug',
                  'max-md:flex-nowrap max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:scrollbar-hide max-md:touch-pan-x max-md:scroll-smooth max-md:pb-0.5 max-md:-mx-1 max-md:px-1',
                  'md:flex-wrap md:overflow-x-visible md:overflow-y-visible md:mx-0 md:px-0 md:touch-auto',
                ].join(' ')}
                style={{ WebkitOverflowScrolling: 'touch' }}
                aria-label="Wizard sections"
              >
                {wizardPhaseNames.map((label, i) => {
                  const entryStep = symptomWizardPhaseProgress.phaseEntrySteps[i]
                  const isCurrent = label === symptomWizardPhaseProgress.currentPhaseLabel
                  const canGo = typeof entryStep === 'number' && entryStep <= currentStep
                  return (
                    <Fragment key={`${label}-${i}`}>
                      {i > 0 && (
                        <ChevronRight
                          className={[
                            'w-4 h-4 shrink-0 self-center',
                            canGo ? 'text-muted/50' : 'text-muted/50 opacity-45',
                          ].join(' ')}
                          strokeWidth={2.25}
                          aria-hidden
                        />
                      )}
                      <button
                        type="button"
                        disabled={!canGo}
                        aria-current={isCurrent ? 'step' : undefined}
                        onClick={() => {
                          if (canGo) setCurrentStep(entryStep)
                        }}
                        className={[
                          'shrink-0 min-h-11 inline-flex items-center rounded-md px-2 -mx-0.5 text-left whitespace-nowrap touch-manipulation transition-colors [-webkit-tap-highlight-color:transparent]',
                          isCurrent
                            ? 'font-semibold text-cadet-blue'
                            : 'font-medium text-muted',
                          canGo && !isCurrent
                            ? 'hover:text-cadet-blue hover:underline cursor-pointer'
                            : '',
                          !canGo ? 'opacity-45 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    </Fragment>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      )}

      {/* Wizard Container */}
      <div className="min-w-0 w-full max-w-full">
        {/* Step 0: Landing Page */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-20 sm:pt-0">
            {/* Icon - same as home page symptoms card */}
            <div className="w-14 h-14 bg-white dark:bg-[var(--bg-icon-container)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Thermometer className="w-7 h-7 text-emerald-600 dark:[color:var(--text-goal-icon-success)]" />
          </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4 sm:mb-6">Log Symptoms</h2>
            
            {/* Optional description */}
            <p className="text-base sm:text-lg font-sans text-muted mb-6 max-w-md">Track your daily symptoms to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="button-cadet px-4 py-2 text-base sm:text-lg font-semibold tracking-wide rounded-lg transition-colors"
            >
              Start now
            </button>
          </div>
        )}

        {/* Step 1: When did symptoms begin? */}
        {currentStep === 1 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">When did your symptoms begin?</h3>
            <p className="text-sm text-muted mb-5">Select the date your symptoms started</p>
            <div>
              <label className="block text-base font-medium text-secondary mb-2">Date</label>
              <div className="relative w-full sm:max-w-[150px]">
                <DatePicker
                  ref={datePickerRef}
                  id="symptom-start-date"
                  selected={formData.symptomStartDate ? new Date(formData.symptomStartDate + 'T12:00:00') : null}
                  openToDate={formData.symptomStartDate ? new Date(formData.symptomStartDate + 'T12:00:00') : new Date()}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, symptomStartDate: date ? date.toISOString().split('T')[0] : '' }))
                    setDateErrors(prev => ({ ...prev, day: '', month: '', year: '' }))
                  }}
                  customInput={<SymptomDateInput onIconClick={() => datePickerRef.current?.setOpen?.(true)} />}
                  placeholderText="e.g. 14/09/2014"
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date(2020, 0, 1)}
                  maxDate={new Date()}
                  preventOpenOnFocus
                  wrapperClassName="w-full"
                  enableTabLoop={false}
                />
              </div>
            </div>
            {(dateErrors.day || dateErrors.month || dateErrors.year) && (
              <div className="mt-4 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{dateErrors.day || dateErrors.month || dateErrors.year}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Are symptoms still ongoing? */}
        {currentStep === 2 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Are symptoms still ongoing?</h3>
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
            {fieldErrors.isOngoing && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.isOngoing}</p>
              </div>
            )}
            </div>
        )}

        {/* Step 3: When did symptoms end? (only if not ongoing) */}
        {currentStep === 3 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">When did symptoms end?</h3>
            <p className="text-sm text-muted mb-5">Select the date your symptoms ended</p>
            <div>
              <label className="block text-base font-medium text-secondary mb-2">Date</label>
              <div className="relative w-full sm:max-w-[150px]">
                <DatePicker
                  ref={datePickerEndRef}
                  id="symptom-end-date"
                  selected={formData.symptomEndDate ? new Date(formData.symptomEndDate + 'T12:00:00') : null}
                  openToDate={formData.symptomEndDate ? new Date(formData.symptomEndDate + 'T12:00:00') : new Date()}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, symptomEndDate: date ? date.toISOString().split('T')[0] : '' }))
                    setDateErrors(prev => ({ ...prev, endDay: '', endMonth: '', endYear: '' }))
                  }}
                  customInput={<SymptomDateInput onIconClick={() => datePickerEndRef.current?.setOpen?.(true)} />}
                  placeholderText="e.g. 14/09/2014"
                  dateFormat="dd/MM/yyyy"
                  minDate={formData.symptomStartDate ? new Date(formData.symptomStartDate + 'T12:00:00') : new Date(2020, 0, 1)}
                  maxDate={new Date()}
                  preventOpenOnFocus
                  wrapperClassName="w-full"
                  enableTabLoop={false}
                />
              </div>
            </div>
            {(dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear) && (
              <div className="mt-4 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{dateErrors.endDay || dateErrors.endMonth || dateErrors.endYear}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Symptom Severity */}
        {currentStep === 4 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-4 sm:mb-5">
              {formData.isOngoing ? 'How severe are your symptoms?' : 'How severe were your symptoms?'}
            </h3>
            <p className="text-sm text-muted mb-5">Choose the closest match.</p>
            <div className="w-full">
              <div
                role="group"
                aria-label="Symptom severity: mild through extreme"
                className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-2"
              >
                {SEVERITY_WORD_OPTIONS.map((opt) => {
                  const band = formData.severity ? wizardRatingToBand(formData.severity) : null
                  const selected = band !== null && band === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWizardRating('severity', opt.value)}
                      aria-pressed={selected}
                      title={`${opt.value} out of 10`}
                      className={`min-h-[2.75rem] rounded-lg px-2 py-2.5 text-center text-sm font-medium leading-snug touch-manipulation transition-colors sm:min-h-11 sm:px-3 sm:text-base ${
                        selected
                          ? 'border-2 text-primary'
                          : 'border border-[var(--border-input)] bg-[var(--bg-card-inner)] text-primary'
                      }`}
                      style={selected ? WIZARD_RATING_SELECTED_CHIP_STYLE : undefined}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {fieldErrors.severity && (
              <div className="mt-4 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.severity}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Stress Level */}
        {currentStep === 5 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-4 sm:mb-5">
              {formData.isOngoing ? 'How stressed are you feeling?' : 'How stressed were you feeling during that time?'}
            </h3>
            <p className="text-sm text-muted mb-5">Choose the closest match.</p>
            <div className="w-full">
              <div
                role="group"
                aria-label="Stress level: calm through very stressed"
                className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-2"
              >
                {STRESS_WORD_OPTIONS.map((opt) => {
                  const band = formData.stress_level ? wizardRatingToBand(formData.stress_level) : null
                  const selected = band !== null && band === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWizardRating('stress_level', opt.value)}
                      aria-pressed={selected}
                      title={`${opt.value} out of 10`}
                      className={`min-h-[2.75rem] rounded-lg px-2 py-2.5 text-center text-sm font-medium leading-snug touch-manipulation transition-colors sm:min-h-11 sm:px-3 sm:text-base ${
                        selected
                          ? 'border-2 text-primary'
                          : 'border border-[var(--border-input)] bg-[var(--bg-card-inner)] text-primary'
                      }`}
                      style={selected ? WIZARD_RATING_SELECTED_CHIP_STYLE : undefined}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {fieldErrors.stress_level && (
              <div className="mt-4 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.stress_level}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Bathroom Frequency */}
        {currentStep === 6 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">How many times a day do you usually empty your bowels?</h3>
            <p className="text-sm text-muted mb-5">For example, '3' or '5'</p>

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
                <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                  <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.normal_bathroom_frequency}</p>
          </div>
              )}
            </div>
        )}

        {/* Step 7: Bathroom Frequency Change Question */}
        {currentStep === 7 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">
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
            {fieldErrors.bathroom_frequency_changed && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.bathroom_frequency_changed}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 8: Bathroom Frequency Change Details */}
        {currentStep === 8 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">Describe your change</h3>
            <p className="text-sm text-muted mb-5">For example, 'increased to 8-10 times per day, blood present, mucus, loose stools'</p>
            <textarea
              id="bathroom_frequency_change_details"
              name="bathroom_frequency_change_details"
              rows="4"
              value={formData.bathroom_frequency_change_details}
              onChange={handleInputChange}
              className="w-full px-4 py-3 input-field-wizard resize-none"
            />
            {fieldErrors.bathroom_frequency_change_details && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.bathroom_frequency_change_details}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 9: Smoking questions */}
        {currentStep === 9 && (
          <div className="mb-5">
            {isFirstTimeUser ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Do you smoke?</h3>
            ) : userPreferences?.isSmoker ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">
                {isSymptomDayToday ? 'Did you smoke today?' : `Did you smoke on ${symptomDayLabel}?`}
              </h3>
            ) : (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Do you smoke?</h3>
            )}
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name={!isFirstTimeUser && userPreferences?.isSmoker ? 'smoked_on_symptom_day' : 'smoker'}
                    value="true"
                    checked={!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === true : formData.smoker === true}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    (!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === true : formData.smoker === true)
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {(!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === true : formData.smoker === true) && (
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
                    name={!isFirstTimeUser && userPreferences?.isSmoker ? 'smoked_on_symptom_day' : 'smoker'}
                    value="false"
                    checked={!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === false : formData.smoker === false}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    (!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === false : formData.smoker === false)
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {(!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_on_symptom_day === false : formData.smoker === false) && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">No</span>
              </label>
            </div>
            {!isFirstTimeUser && userPreferences?.isSmoker && fieldErrors.smoked_on_symptom_day && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoked_on_symptom_day}</p>
              </div>
            )}
            {isFirstTimeUser && fieldErrors.smoker && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoker}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 10: Smoking habits + (first-time only) symptom-day follow-ups */}
        {currentStep === 10 && (
          <div className="mb-5">
            {formData.smoker === true && smokingStep10Phase === 'dayAmount' ? (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">
                  {!isFirstTimeUser
                    ? 'How much did you smoke?'
                    : (isSymptomDayToday ? 'How much did you smoke today?' : `How much did you smoke on ${symptomDayLabel}?`)}
                </h3>
                <p className="text-sm text-muted mb-5">For example, '3 cigarettes' or '1 cigar'</p>
                <input
                  type="text"
                  id="smoked_amount_on_symptom_day"
                  name="smoked_amount_on_symptom_day"
                  value={formData.smoked_amount_on_symptom_day}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 input-field-wizard"
                  autoComplete="off"
                />
                {fieldErrors.smoked_amount_on_symptom_day && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoked_amount_on_symptom_day}</p>
                  </div>
                )}
              </>
            ) : formData.smoker === true && smokingStep10Phase === 'dayYesNo' ? (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">
                  {isSymptomDayToday ? 'Did you smoke today?' : `Did you smoke on ${symptomDayLabel}?`}
                </h3>
                <div className="flex space-x-8">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="smoked_on_symptom_day"
                        value="true"
                        checked={formData.smoked_on_symptom_day === true}
                        onChange={handleInputChange}
                        className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                        style={{
                          accentColor: 'var(--text-cadet-blue)',
                          '--tw-accent-color': '#5F9EA0'
                        }}
                      />
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.smoked_on_symptom_day === true
                          ? 'border-[var(--radio-border)] bg-white'
                          : 'border-[var(--radio-border)] bg-white'
                      }`}>
                        {formData.smoked_on_symptom_day === true && (
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
                        name="smoked_on_symptom_day"
                        value="false"
                        checked={formData.smoked_on_symptom_day === false}
                        onChange={handleInputChange}
                        className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                        style={{
                          accentColor: 'var(--text-cadet-blue)',
                          '--tw-accent-color': '#5F9EA0'
                        }}
                      />
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.smoked_on_symptom_day === false
                          ? 'border-[var(--radio-border)] bg-white'
                          : 'border-[var(--radio-border)] bg-white'
                      }`}>
                        {formData.smoked_on_symptom_day === false && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                        )}
                      </span>
                    </div>
                    <span className="ml-3 text-lg text-secondary">No</span>
                  </label>
                </div>
                {fieldErrors.smoked_on_symptom_day && (
                  <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoked_on_symptom_day}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">
                  {!isFirstTimeUser && userPreferences?.isSmoker
                    ? 'How much did you smoke?'
                    : 'Please describe your smoking habits'}
                </h3>
                <p className="text-sm text-muted mb-5">
                  {!isFirstTimeUser && userPreferences?.isSmoker
                    ? "For example, '5 cigarettes' or '1 cigar'"
                    : "For example, '1 pack of cigarettes per day, occasional cigars'"
                  }
                </p>
                <input
                  type="text"
                  id={!isFirstTimeUser && userPreferences?.isSmoker ? 'smoked_amount_on_symptom_day' : 'smoking_habits'}
                  name={!isFirstTimeUser && userPreferences?.isSmoker ? 'smoked_amount_on_symptom_day' : 'smoking_habits'}
                  value={!isFirstTimeUser && userPreferences?.isSmoker ? formData.smoked_amount_on_symptom_day : formData.smoking_habits}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 input-field-wizard"
                  autoComplete="off"
                />
                {!isFirstTimeUser && userPreferences?.isSmoker && fieldErrors.smoked_amount_on_symptom_day && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoked_amount_on_symptom_day}</p>
                  </div>
                )}
                {(isFirstTimeUser || !userPreferences?.isSmoker) && fieldErrors.smoking_habits && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.smoking_habits}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 11: Alcohol questions */}
        {currentStep === 11 && (
          <div className="mb-5">
            {isFirstTimeUser ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Do you drink alcohol?</h3>
            ) : userPreferences?.isDrinker ? (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">
                {isSymptomDayToday ? 'Did you drink alcohol today?' : `Did you drink alcohol on ${symptomDayLabel}?`}
              </h3>
            ) : (
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Do you drink alcohol?</h3>
            )}
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name={!isFirstTimeUser && userPreferences?.isDrinker ? 'drank_on_symptom_day' : 'alcohol'}
                    value="true"
                    checked={!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === true : formData.alcohol === true}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    (!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === true : formData.alcohol === true)
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {(!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === true : formData.alcohol === true) && (
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
                    name={!isFirstTimeUser && userPreferences?.isDrinker ? 'drank_on_symptom_day' : 'alcohol'}
                    value="false"
                    checked={!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === false : formData.alcohol === false}
                    onChange={handleInputChange}
                    className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                    style={{
                      accentColor: 'var(--text-cadet-blue)',
                      '--tw-accent-color': '#5F9EA0'
                    }}
                  />
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    (!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === false : formData.alcohol === false)
                      ? 'border-[var(--radio-border)] bg-white' 
                      : 'border-[var(--radio-border)] bg-white'
                  }`}>
                    {(!isFirstTimeUser && userPreferences?.isDrinker ? formData.drank_on_symptom_day === false : formData.alcohol === false) && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                    )}
                  </span>
                </div>
                <span className="ml-3 text-lg text-secondary">No</span>
              </label>
            </div>
            {!isFirstTimeUser && userPreferences?.isDrinker && fieldErrors.drank_on_symptom_day && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.drank_on_symptom_day}</p>
              </div>
            )}
            {isFirstTimeUser && fieldErrors.alcohol && (
              <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.alcohol}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 12: Alcohol details + (first-time only) symptom-day follow-ups */}
        {currentStep === 12 && (
          <div className="mb-5">
            {formData.alcohol === true && alcoholStep12Phase === 'dayAmount' ? (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">
                  {isSymptomDayToday
                    ? 'How many units of alcohol did you drink today?'
                    : `How many units of alcohol did you drink on ${symptomDayLabel}?`}
                </h3>
                <p className="text-sm text-muted mb-5">For example, 0.5, 2 or 5</p>
                <div className="w-20">
                  <input
                    type="number"
                    id="alcohol_units_on_symptom_day"
                    name="alcohol_units_on_symptom_day"
                    min="0"
                    max="30"
                    step="0.1"
                    value={formData.alcohol_units_on_symptom_day}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {fieldErrors.alcohol_units_on_symptom_day && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.alcohol_units_on_symptom_day}</p>
                  </div>
                )}
              </>
            ) : formData.alcohol === true && alcoholStep12Phase === 'dayYesNo' ? (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">
                  {isSymptomDayToday ? 'Did you drink alcohol today?' : `Did you drink alcohol on ${symptomDayLabel}?`}
                </h3>
                <div className="flex space-x-8">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="drank_on_symptom_day"
                        value="true"
                        checked={formData.drank_on_symptom_day === true}
                        onChange={handleInputChange}
                        className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                        style={{
                          accentColor: 'var(--text-cadet-blue)',
                          '--tw-accent-color': '#5F9EA0'
                        }}
                      />
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.drank_on_symptom_day === true
                          ? 'border-[var(--radio-border)] bg-white'
                          : 'border-[var(--radio-border)] bg-white'
                      }`}>
                        {formData.drank_on_symptom_day === true && (
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
                        name="drank_on_symptom_day"
                        value="false"
                        checked={formData.drank_on_symptom_day === false}
                        onChange={handleInputChange}
                        className="w-6 h-6 text-cadet-blue opacity-0 absolute radio-button"
                        style={{
                          accentColor: 'var(--text-cadet-blue)',
                          '--tw-accent-color': '#5F9EA0'
                        }}
                      />
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.drank_on_symptom_day === false
                          ? 'border-[var(--radio-border)] bg-white'
                          : 'border-[var(--radio-border)] bg-white'
                      }`}>
                        {formData.drank_on_symptom_day === false && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#5F9EA0]"></div>
                        )}
                      </span>
                    </div>
                    <span className="ml-3 text-lg text-secondary">No</span>
                  </label>
                </div>
                {fieldErrors.drank_on_symptom_day && (
                  <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.drank_on_symptom_day}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-2 sm:mb-5">
                  {!isFirstTimeUser && userPreferences?.isDrinker
                    ? 'How many units of alcohol did you drink?'
                    : 'On average, how many units of alcohol do you drink per week?'}
                </h3>
                <p className="text-sm text-muted mb-5">For example, 0.5, 2 or 5</p>
                <div className="w-20">
                  <input
                    type="number"
                    id={!isFirstTimeUser && userPreferences?.isDrinker ? 'alcohol_units_on_symptom_day' : 'average_alcohol_units_pw'}
                    name={!isFirstTimeUser && userPreferences?.isDrinker ? 'alcohol_units_on_symptom_day' : 'average_alcohol_units_pw'}
                    min="0"
                    max="30"
                    step="0.1"
                    value={!isFirstTimeUser && userPreferences?.isDrinker ? formData.alcohol_units_on_symptom_day : formData.average_alcohol_units_pw}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="input-field-wizard [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {!isFirstTimeUser && userPreferences?.isDrinker && fieldErrors.alcohol_units_on_symptom_day && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.alcohol_units_on_symptom_day}</p>
                  </div>
                )}
                {(isFirstTimeUser || !userPreferences?.isDrinker) && fieldErrors.average_alcohol_units_pw && (
                  <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                    <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.average_alcohol_units_pw}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 13: Breakfast */}
        {currentStep === 13 && (
          <div className="mb-5">
            <div className="space-y-6">
            {/* Breakfast */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
                <div className="min-w-0 self-start sm:self-center">
                  <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">
                    {getMealLabel('breakfast')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('breakfast')}
                  disabled={formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    formData.breakfast.length > 0 && (formData.breakfast[formData.breakfast.length - 1]?.food === '' || formData.breakfast[formData.breakfast.length - 1]?.quantity === '')
                      ? 'button-disabled'
                      : 'button-cadet'
                  }`}
                >
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {formData.breakfast.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.breakfast.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('breakfast', index)}
                        className="absolute -right-2 -top-2 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200"
                        style={{ backgroundColor: 'var(--text-cadet-blue)' }}
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
                    setFieldErrors(prev => ({ ...prev, breakfast: '' }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for breakfast</span>
              </div>
            </div>
            {fieldErrors.breakfast && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.breakfast}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 14: Lunch */}
        {currentStep === 14 && (
          <div className="mb-5">
            <div className="space-y-6">
            {/* Lunch */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
                <div className="min-w-0 self-start sm:self-center">
                  <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">
                    {getMealLabel('lunch')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('lunch')}
                  disabled={formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    formData.lunch.length > 0 && (formData.lunch[formData.lunch.length - 1]?.food === '' || formData.lunch[formData.lunch.length - 1]?.quantity === '')
                      ? 'button-disabled'
                      : 'button-cadet'
                  }`}
                >
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {formData.lunch.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.lunch.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('lunch', index)}
                        className="absolute -right-2 -top-2 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200"
                        style={{ backgroundColor: 'var(--text-cadet-blue)' }}
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
                    setFieldErrors(prev => ({ ...prev, lunch: '' }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for lunch</span>
              </div>
            </div>
            {fieldErrors.lunch && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.lunch}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 15: Dinner */}
        {currentStep === 15 && (
          <div className="mb-5">
            <div className="space-y-6">
{/* Dinner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
                <div className="min-w-0 self-start sm:self-center">
                  <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">
                    {getMealLabel('dinner')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => addMealItem('dinner')}
                  disabled={formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    formData.dinner.length > 0 && (formData.dinner[formData.dinner.length - 1]?.food === '' || formData.dinner[formData.dinner.length - 1]?.quantity === '')
                      ? 'button-disabled'
                      : 'button-cadet'
                  }`}
                >
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {formData.dinner.map((item, index) => (
                  <div key={index} className="relative">
                    {formData.dinner.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealItem('dinner', index)}
                        className="absolute -right-2 -top-2 rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200"
                        style={{ backgroundColor: 'var(--text-cadet-blue)' }}
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
                    setFieldErrors(prev => ({ ...prev, dinner: '' }))
                  }}
                  className="mr-2 w-4 h-4 text-cadet-blue focus:ring-cadet-blue focus:ring-2"
                  style={{accentColor: 'var(--text-cadet-blue)'}}
                />
                <span className="text-sm text-secondary">I didn't eat anything for dinner</span>
              </div>
            </div>
            {fieldErrors.dinner && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.dinner}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 16: Additional Notes */}
        {currentStep === 16 && (
          <div className="mb-5">
            <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-4 sm:mb-5">Additional notes</h3>
            <p className="text-sm text-muted mb-5">Share any other details about your symptoms, how you're feeling, or triggers you noticed</p>            
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
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold font-title text-primary">
              Review your entry
            </h2>

            {/* Basic Information */}
            <div className="card border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Start Date</span>
                  <span className="text-sm sm:text-base font-medium text-primary">{formData.symptomStartDate ? new Date(formData.symptomStartDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Status</span>
                  <span className="text-sm sm:text-base font-medium text-primary">{formData.isOngoing ? 'Ongoing' : 'Ended'}</span>
                </div>
                {!formData.isOngoing && formData.symptomEndDate && (
                  <div>
                    <span className="text-sm text-cadet-blue block mb-1">End Date</span>
                    <span className="text-sm sm:text-base font-medium text-primary">{new Date(formData.symptomEndDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Severity</span>
                  <span className="text-sm sm:text-base font-medium text-primary">{formData.severity}/10</span>
                </div>
                <div>
                  <span className="text-sm text-cadet-blue block mb-1">Stress Level</span>
                  <span className="text-sm sm:text-base font-medium text-primary">{formData.stress_level}/10</span>
                </div>
              </div>
            </div>

            {/* Bathroom Frequency */}
            <div className="card border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Bathroom Frequency</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-cadet-blue block mb-1">Frequency</span>
                    <span className="text-sm sm:text-base font-medium text-primary">{formData.normal_bathroom_frequency || 'Not set'} times/day</span>
                  </div>
                  {formData.bathroom_frequency_changed && (
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Frequency Changed</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{formData.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
                {formData.bathroom_frequency_changed === 'yes' && formData.bathroom_frequency_change_details && (
                  <div className="pt-3 border-t min-w-0 overflow-hidden" style={{borderColor: 'var(--separator-card)'}}>
                    <span className="text-sm text-cadet-blue block mb-1">Change Description</span>
                    <span className="text-sm sm:text-base font-medium text-primary truncate block" title={formData.bathroom_frequency_change_details}>{formData.bathroom_frequency_change_details}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle */}
            {(isFirstTimeUser ||
              (typeof formData.smoked_on_symptom_day === 'boolean') ||
              (typeof formData.drank_on_symptom_day === 'boolean')) && (
              <div className="card border" style={{borderColor: 'var(--border-card)'}}>
                <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Lifestyle</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isFirstTimeUser && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">Smoker</span>
                        <span className="text-sm sm:text-base font-medium text-primary">{formData.smoker ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {isFirstTimeUser && formData.smoker && formData.smoking_habits && (
                      <div className="min-w-0 overflow-hidden">
                        <span className="text-sm text-cadet-blue block mb-1">
                          Smoking Habits
                        </span>
                        <span className="text-sm sm:text-base font-medium text-primary truncate block" title={formData.smoking_habits}>{formData.smoking_habits}</span>
                      </div>
                    )}
                    {!isFirstTimeUser && typeof formData.smoked_on_symptom_day === 'boolean' && (
                      <div className="min-w-0 overflow-hidden">
                        <span className="text-sm text-cadet-blue block mb-1">Smoked</span>
                        <span className="text-sm sm:text-base font-medium text-primary truncate block" title={formData.smoked_amount_on_symptom_day}>
                          {formData.smoked_on_symptom_day
                            ? (formData.smoked_amount_on_symptom_day || 'Yes')
                            : 'No'}
                        </span>
                      </div>
                    )}
                    {isFirstTimeUser && formData.smoker && formData.smoked_amount_on_symptom_day && (
                      <div className="min-w-0 overflow-hidden">
                        <span className="text-sm text-cadet-blue block mb-1">
                          {isSymptomDayToday ? 'Smoked Today' : `Smoked on ${symptomDayLabel}`}
                        </span>
                        <span className="text-sm sm:text-base font-medium text-primary truncate block" title={formData.smoked_amount_on_symptom_day}>
                          {formData.smoked_amount_on_symptom_day}
                        </span>
                      </div>
                    )}
                    {isFirstTimeUser && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">Alcohol</span>
                        <span className="text-sm sm:text-base font-medium text-primary">{formData.alcohol ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {isFirstTimeUser && formData.alcohol && formData.average_alcohol_units_pw && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">
                          Alcohol Habits (on average)
                        </span>
                        <span className="text-sm sm:text-base font-medium text-primary">
                          {formData.average_alcohol_units_pw} units/week
                        </span>
                      </div>
                    )}
                    {!isFirstTimeUser && typeof formData.drank_on_symptom_day === 'boolean' && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">Alcohol Units Consumed</span>
                        <span className="text-sm sm:text-base font-medium text-primary">
                          {formData.drank_on_symptom_day
                            ? (formData.alcohol_units_on_symptom_day ? `${formData.alcohol_units_on_symptom_day} units` : 'Yes')
                            : 'No'}
                        </span>
                      </div>
                    )}
                    {isFirstTimeUser && formData.alcohol && formData.alcohol_units_on_symptom_day && (
                      <div>
                        <span className="text-sm text-cadet-blue block mb-1">
                          {isSymptomDayToday ? 'Alcohol Units Today' : `Alcohol Units on ${symptomDayLabel}`}
                        </span>
                        <span className="text-sm sm:text-base font-medium text-primary">{formData.alcohol_units_on_symptom_day} units</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Meals */}
            {(() => {
              const mealEntries = []
              if (formData.breakfast.some(item => item.food.trim())) {
                mealEntries.push({ label: 'Breakfast', content: formData.breakfast.filter(item => item.food.trim()).map((item, index) => (
                  <div key={index} className="text-sm sm:text-base font-medium text-primary truncate" title={`${item.food}${item.quantity ? ` (${item.quantity})` : ''}`}>{item.food} {item.quantity ? `(${item.quantity})` : ''}</div>
                )) })
              } else if (formData.breakfast_skipped) {
                mealEntries.push({ label: 'Breakfast', skipped: true })
              }
              if (formData.lunch.some(item => item.food.trim())) {
                mealEntries.push({ label: 'Lunch', content: formData.lunch.filter(item => item.food.trim()).map((item, index) => (
                  <div key={index} className="text-sm sm:text-base font-medium text-primary truncate" title={`${item.food}${item.quantity ? ` (${item.quantity})` : ''}`}>{item.food} {item.quantity ? `(${item.quantity})` : ''}</div>
                )) })
              } else if (formData.lunch_skipped) {
                mealEntries.push({ label: 'Lunch', skipped: true })
              }
              if (formData.dinner.some(item => item.food.trim())) {
                mealEntries.push({ label: 'Dinner', content: formData.dinner.filter(item => item.food.trim()).map((item, index) => (
                  <div key={index} className="text-sm sm:text-base font-medium text-primary truncate" title={`${item.food}${item.quantity ? ` (${item.quantity})` : ''}`}>{item.food} {item.quantity ? `(${item.quantity})` : ''}</div>
                )) })
              } else if (formData.dinner_skipped) {
                mealEntries.push({ label: 'Dinner', skipped: true })
              }
              if (mealEntries.length === 0) return null
              return (
                <div className="card border" style={{borderColor: 'var(--border-card)'}}>
                  <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Meals</h3>
                  <div className="space-y-3">
                    {mealEntries.map((entry, index, array) => (
                      <div key={entry.label + index} className={`min-w-0 ${index < array.length - 1 ? 'border-b pb-3' : ''}`} style={index < array.length - 1 ? {borderColor: 'var(--separator-card)'} : {}}>
                        <span className="text-sm text-cadet-blue block mb-2">{entry.label}</span>
                        {entry.skipped ? (
                          <span className="text-sm sm:text-base font-medium text-primary italic">Didn't eat anything</span>
                        ) : (
                          <div className="space-y-1 min-w-0">{entry.content}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Notes */}
            {formData.notes && (
              <div className="card border min-w-0 overflow-hidden" style={{borderColor: 'var(--border-card)'}}>
                <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Notes</h3>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm sm:text-base font-medium text-primary truncate" title={formData.notes}>{formData.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons - Hide on landing page (step 0) */}
        {currentStep > 0 && (
          <div className="flex justify-start items-center mt-6">
            {currentStep < 17 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-[#5F9EA0] text-white text-base sm:text-lg font-semibold rounded-lg hover:bg-button-cadet-hover transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex min-w-[7.25rem] items-center justify-center px-4 py-2 bg-[#5F9EA0] text-white text-base sm:text-lg font-semibold rounded-lg hover:bg-button-cadet-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-6 w-6 shrink-0 animate-spin" aria-hidden />
                    <span className="sr-only">Submitting</span>
                  </>
                ) : (
                  'Submit'
                )}
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
