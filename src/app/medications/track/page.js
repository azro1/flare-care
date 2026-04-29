'use client'

import { useState, useEffect, useLayoutEffect, useRef, forwardRef, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ChartLine, Calendar, ChevronRight, Loader2 } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'

const MedicationDateInput = forwardRef(({ value, onClick, onChange, placeholder, id, className, onIconClick, forcePlaceholder = false, ...rest }, ref) => (
  <div className={`symptom-date-input-wrapper flex items-center input-field-wizard ${className ?? ''}`.trim()}>
    <input
      ref={ref}
      readOnly
      value={forcePlaceholder ? '' : (value ?? '')}
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
      <Calendar className="w-5 h-5 text-slate-600 dark:text-gray-500" />
    </button>
  </div>
))
MedicationDateInput.displayName = 'MedicationDateInput'

/** Wizard step id → section name (steps 1–2 missed, 3–4 NSAIDs, 5–6 antibiotics, 7 review). */
function medicationStepPhaseLabel(step) {
  if (step <= 0) return ''
  if (step <= 2) return 'Missed medications'
  if (step <= 4) return 'NSAIDs'
  if (step <= 6) return 'Antibiotics'
  return 'Review'
}

/** Deduped phase names and the first wizard step id for each segment (e.g. [1,3,5,7] → four pairs). */
function medicationPhaseBreadcrumbsForWizardSteps(stepIds) {
  const names = []
  const entrySteps = []
  for (const s of stepIds) {
    const label = medicationStepPhaseLabel(s)
    if (names[names.length - 1] !== label) {
      names.push(label)
      entrySteps.push(s)
    }
  }
  return { names, entrySteps }
}

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

  const defaultMedicationForm = () => ({
    missedMedications: null,
    missedMedicationsList: [{ medication: '', date: new Date(), timeOfDay: '', dateTouched: false }],
    nsaidUsage: null,
    nsaidList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '', dateTouched: false }],
    antibioticUsage: null,
    antibioticList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '', dateTouched: false }]
  })

  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFormData = localStorage.getItem('medication-wizard-form')
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData)
          return {
            ...defaultMedicationForm(),
            ...parsed,
            missedMedicationsList: (parsed.missedMedicationsList || defaultMedicationForm().missedMedicationsList).map((item) => ({
              ...item,
              dateTouched: item.dateTouched === true,
            })),
            nsaidList: (parsed.nsaidList || defaultMedicationForm().nsaidList).map((item) => ({
              ...item,
              dateTouched: item.dateTouched === true,
            })),
            antibioticList: (parsed.antibioticList || defaultMedicationForm().antibioticList).map((item) => ({
              ...item,
              dateTouched: item.dateTouched === true,
            })),
            missedMedications:
              parsed.missedMedications === true || parsed.missedMedications === false
                ? parsed.missedMedications
                : null,
            nsaidUsage:
              parsed.nsaidUsage === true || parsed.nsaidUsage === false ? parsed.nsaidUsage : null,
            antibioticUsage:
              parsed.antibioticUsage === true || parsed.antibioticUsage === false
                ? parsed.antibioticUsage
                : null
          }
        } catch {
          return defaultMedicationForm()
        }
      }
    }
    return defaultMedicationForm()
  })

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showNoDataModal, setShowNoDataModal] = useState(false)
  const [dateErrors, setDateErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const missedMedDatePickerRefs = useRef({})
  const nsaidDatePickerRefs = useRef({})
  const antibioticDatePickerRefs = useRef({})
  const phaseBreadcrumbNavRef = useRef(null)

  // Detect mobile for DatePicker
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Remove legacy FlareBot localStorage keys (feature removed).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const legacyKeys = [
      'medication-chat-mode',
      'medication-chat-messages',
      'medication-chat-draft',
      'medication-chat-status',
      'medication-chat-missing-fields',
      'medication-chat-warnings',
      'medication-chat-ready-message',
      'medication-chat-restore-once',
    ]
    try {
      legacyKeys.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  }, [])

  // Default date to today when reaching relevant step for any items with null/empty date
  useEffect(() => {
    if (currentStep === 2) {
      const hasNullDate = formData.missedMedicationsList.some(item => !item.date)
      if (hasNullDate) {
        setFormData(prev => ({
          ...prev,
          missedMedicationsList: prev.missedMedicationsList.map(item =>
            !item.date ? { ...item, date: new Date() } : item
          )
        }))
      }
    }
    if (currentStep === 4) {
      const hasNullDate = formData.nsaidList.some(item => !item.date)
      if (hasNullDate) {
        setFormData(prev => ({
          ...prev,
          nsaidList: prev.nsaidList.map(item =>
            !item.date ? { ...item, date: new Date() } : item
          )
        }))
      }
    }
    if (currentStep === 6) {
      const hasNullDate = formData.antibioticList.some(item => !item.date)
      if (hasNullDate) {
        setFormData(prev => ({
          ...prev,
          antibioticList: prev.antibioticList.map(item =>
            !item.date ? { ...item, date: new Date() } : item
          )
        }))
      }
    }
  }, [currentStep, formData.missedMedicationsList, formData.nsaidList, formData.antibioticList])

  // Clear localStorage when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medication-wizard-step')
        localStorage.removeItem('medication-wizard-form')
      }
    }
  }, [])

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
        document.body.style.backgroundColor = 'transparent'
        document.documentElement.style.background = 'var(--bg-main-gradient)'
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

  // Manual wizard step 7 review: scroll to top.
  useEffect(() => {
    if (currentStep !== 7) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
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

  // Phase breadcrumb path only advances when `currentStep` changes — not when Yes/No toggles change how many steps exist (avoids 3/6 ↔ 3/7 flicker).
  const medicationWizardProgress = useMemo(() => {
    const visible = getVisibleSteps()
    const wizardOnly = visible.filter((s) => s > 0)
    const idx = wizardOnly.indexOf(currentStep)
    if (idx < 0 || wizardOnly.length === 0) {
      return {
        step: 0,
        total: 0,
        phaseNames: [],
        phaseEntrySteps: [],
        currentPhaseLabel: '',
      }
    }
    const { names: phaseNames, entrySteps: phaseEntrySteps } =
      medicationPhaseBreadcrumbsForWizardSteps(wizardOnly)
    const currentPhaseLabel = medicationStepPhaseLabel(currentStep)
    return {
      step: idx + 1,
      total: wizardOnly.length,
      phaseNames,
      phaseEntrySteps,
      currentPhaseLabel,
    }
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps -- label/path snapshot when entering step only (not on Yes/No toggles)

  // Below md: single-line scroll chips — keep the active step in view.
  useLayoutEffect(() => {
    if (currentStep <= 0) return
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
    const nav = phaseBreadcrumbNavRef.current
    if (!nav) return
    const current = nav.querySelector('button[aria-current="step"]')
    if (current instanceof HTMLElement) {
      current.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'instant' })
    }
  }, [currentStep, medicationWizardProgress.currentPhaseLabel])

  const nextStep = () => {
    if (currentStep === 1) {
      if (formData.missedMedications !== true && formData.missedMedications !== false) {
        setFieldErrors(prev => ({
          ...prev,
          missedMedications: 'Please select Yes or No'
        }))
        return
      }
      setFieldErrors(prev => ({ ...prev, missedMedications: '' }))
    }

    if (currentStep === 3) {
      if (formData.nsaidUsage !== true && formData.nsaidUsage !== false) {
        setFieldErrors(prev => ({ ...prev, nsaidUsage: 'Please select Yes or No' }))
        return
      }
      setFieldErrors(prev => ({ ...prev, nsaidUsage: '' }))
    }

    if (currentStep === 5) {
      if (formData.antibioticUsage !== true && formData.antibioticUsage !== false) {
        setFieldErrors(prev => ({ ...prev, antibioticUsage: 'Please select Yes or No' }))
        return
      }
      setFieldErrors(prev => ({ ...prev, antibioticUsage: '' }))
    }

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
      const nextStepValue = visibleSteps[currentIndex + 1]
      // Skip empty review: same filters as handleSubmit / saveMedicationTracking
      if (nextStepValue === 7) {
        const cleanedData = {
          missedMedicationsList: formData.missedMedications
            ? formData.missedMedicationsList.filter((item) => item.medication.trim())
            : [],
          nsaidList: formData.nsaidUsage ? formData.nsaidList.filter((item) => item.medication.trim()) : [],
          antibioticList: formData.antibioticUsage
            ? formData.antibioticList.filter((item) => item.medication.trim())
            : [],
        }
        const hasNoData =
          cleanedData.missedMedicationsList.length === 0 &&
          cleanedData.nsaidList.length === 0 &&
          cleanedData.antibioticList.length === 0
        if (hasNoData) {
          setShowNoDataModal(true)
          return
        }
      }
      setCurrentStep(nextStepValue)
    }
  }

  // Handle form data changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const nextVal =
      type === 'checkbox'
        ? checked
        : type === 'radio' && (value === 'true' || value === 'false')
          ? value === 'true'
          : value
    setFormData(prev => ({
      ...prev,
      [name]: nextVal
    }))
    if (name === 'missedMedications' || name === 'nsaidUsage' || name === 'antibioticUsage') {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Dosage: digits only; we add "mg" when saving and displaying
  const normalizeDosage = (raw) => (raw || '').replace(/\D/g, '').slice(0, 5)

  const saveMedicationTracking = async (cleanedData) => {
    const hasNoData =
      cleanedData.missedMedicationsList.length === 0 &&
      cleanedData.nsaidList.length === 0 &&
      cleanedData.antibioticList.length === 0

    if (hasNoData) {
      setShowNoDataModal(true)
      return false
    }

    const newMedicationTracking = {
      id: `medication-tracking-${Date.now()}`,
      user_id: user?.id,
      name: 'Medication Tracking',
      missed_medications_list: cleanedData.missedMedicationsList,
      nsaid_list: cleanedData.nsaidList.map(item => ({ ...item, dosage: item.dosage ? `${item.dosage}mg` : '' })),
      antibiotic_list: cleanedData.antibioticList.map(item => ({ ...item, dosage: item.dosage ? `${item.dosage}mg` : '' })),
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from(TABLES.LOG_MEDICATIONS)
      .insert([newMedicationTracking])

    if (error) throw error

    localStorage.removeItem('medication-wizard-step')
    localStorage.removeItem('medication-wizard-form')
    localStorage.setItem('showMedicationToast', 'true')
    router.push('/')
    return true
  }

  // Missed medications list handlers
  const addMissedMedication = () => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: [...prev.missedMedicationsList, { medication: '', date: new Date(), timeOfDay: '', dateTouched: false }]
    }))
  }

  const removeMissedMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.filter((_, i) => i !== index)
    }))
  }

  const updateMissedMedication = (index, field, value) => {
    const nextValue = field === 'date' ? { date: value, dateTouched: true } : { [field]: value }
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: prev.missedMedicationsList.map((item, i) =>
        i === index ? { ...item, ...nextValue } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        missedMedicationsList: formData.missedMedicationsList.map((item, i) =>
          i === index ? { ...item, ...nextValue } : item
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
      nsaidList: [...prev.nsaidList, { medication: '', date: new Date(), timeOfDay: '', dosage: '', dateTouched: false }]
    }))
  }

  const removeNsaid = (index) => {
    setFormData(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.filter((_, i) => i !== index)
    }))
  }

  const updateNsaid = (index, field, value) => {
    const safeValue = field === 'dosage' ? normalizeDosage(value) : value
    const nextValue = field === 'date' ? { date: safeValue, dateTouched: true } : { [field]: safeValue }
    setFormData(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.map((item, i) =>
        i === index ? { ...item, ...nextValue } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        nsaidList: formData.nsaidList.map((item, i) =>
          i === index ? { ...item, ...nextValue } : item
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
      antibioticList: [...prev.antibioticList, { medication: '', date: new Date(), timeOfDay: '', dosage: '', dateTouched: false }]
    }))
  }

  const removeAntibiotic = (index) => {
    setFormData(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.filter((_, i) => i !== index)
    }))
  }

  const updateAntibiotic = (index, field, value) => {
    const safeValue = field === 'dosage' ? normalizeDosage(value) : value
    const nextValue = field === 'date' ? { date: safeValue, dateTouched: true } : { [field]: safeValue }
    setFormData(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.map((item, i) =>
        i === index ? { ...item, ...nextValue } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        antibioticList: formData.antibioticList.map((item, i) =>
          i === index ? { ...item, ...nextValue } : item
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
    // Prevent multiple submissions
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    // Filter out empty entries
    const cleanedData = {
      missedMedicationsList: formData.missedMedications ? formData.missedMedicationsList.filter(item => item.medication.trim()) : [],
      nsaidList: formData.nsaidUsage ? formData.nsaidList.filter(item => item.medication.trim()) : [],
      antibioticList: formData.antibioticUsage ? formData.antibioticList.filter(item => item.medication.trim()) : []
    }

    try {
      const saved = await saveMedicationTracking(cleanedData)
      if (!saved) {
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error saving medication tracking:', error)
      setIsSubmitting(false)
    }
  }

  // Render based on current step
  const renderStep = () => {
    // Step 1: Missed medications question
    if (currentStep === 1) {
      return (
        <div className="mb-5">
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Did you miss any prescribed medications recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="missedMedications"
                  value="false"
                  checked={formData.missedMedications === false}
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
                  checked={formData.missedMedications === true}
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
          {fieldErrors.missedMedications && (
            <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
              <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.missedMedications}</p>
            </div>
          )}
        </div>
      )
    }

    // Step 2: Missed medications list (only if yes)
    if (currentStep === 2) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
              <div className="min-w-0 self-start sm:self-center">
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">Which medications did you miss?</h3>
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
                      className="absolute -right-2 -top-2 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200 z-10"
                      style={{ backgroundColor: 'var(--text-cadet-blue)' }}
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Medication"
                      value={item.medication}
                      onChange={(e) => updateMissedMedication(index, 'medication', e.target.value)}
                      className="input-field-wizard w-full sm:flex-1 min-w-0"
                    />
                    <DatePicker
                      ref={(el) => { missedMedDatePickerRefs.current[index] = el }}
                      selected={item.date}
                      onChange={(date) => updateMissedMedication(index, 'date', date)}
                      placeholderText="Date"
                      customInput={<MedicationDateInput forcePlaceholder={!item.dateTouched} onIconClick={() => missedMedDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      preventOpenOnFocus
                      wrapperClassName="w-full sm:w-auto sm:flex-initial min-w-0"
                      enableTabLoop={false}
                    />
                    <select
                      value={item.timeOfDay}
                      onChange={(e) => updateMissedMedication(index, 'timeOfDay', e.target.value)}
                      className={`input-field-wizard w-full sm:flex-1 min-w-0 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                    >
                        <option value="">Select time of day</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.missedMedicationsList && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.missedMedicationsList}</p>
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
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Did you take any NSAIDs (ibuprofen, naproxen, aspirin) recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="nsaidUsage"
                  value="false"
                  checked={formData.nsaidUsage === false}
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
                  checked={formData.nsaidUsage === true}
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
          {fieldErrors.nsaidUsage && (
            <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
              <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.nsaidUsage}</p>
            </div>
          )}
        </div>
      )
    }

    // Step 4: NSAIDs list (only if yes)
    if (currentStep === 4) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
              <div className="min-w-0 self-start sm:self-center">
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">Which NSAIDs did you take?</h3>
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
                      className="absolute -right-2 -top-2 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200 z-10"
                      style={{ backgroundColor: 'var(--text-cadet-blue)' }}
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Medication"
                      value={item.medication}
                      onChange={(e) => updateNsaid(index, 'medication', e.target.value)}
                      className="input-field-wizard w-full sm:flex-1 min-w-0"
                    />
                    <DatePicker
                      ref={(el) => { nsaidDatePickerRefs.current[index] = el }}
                      selected={item.date}
                      onChange={(date) => updateNsaid(index, 'date', date)}
                      placeholderText="Select date taken"
                      customInput={<MedicationDateInput forcePlaceholder={!item.dateTouched} onIconClick={() => nsaidDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      preventOpenOnFocus
                      wrapperClassName="w-full sm:w-auto sm:flex-initial min-w-0"
                      enableTabLoop={false}
                    />
                    <select
                      value={item.timeOfDay}
                      onChange={(e) => updateNsaid(index, 'timeOfDay', e.target.value)}
                      className={`input-field-wizard w-full sm:flex-1 min-w-0 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                    >
                      <option value="">Select time of day</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="50mg"
                      value={item.dosage}
                      onChange={(e) => updateNsaid(index, 'dosage', e.target.value)}
                      maxLength={5}
                      className="input-field-wizard w-full sm:w-20 flex-1 sm:flex-initial min-w-0"
                      autoComplete="off"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.nsaidList && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.nsaidList}</p>
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
          <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5">Did you take any antibiotics recently?</h3>
          <div className="flex space-x-8">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="antibioticUsage"
                  value="false"
                  checked={formData.antibioticUsage === false}
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
                  checked={formData.antibioticUsage === true}
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
          {fieldErrors.antibioticUsage && (
            <div className="mt-5 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
              <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.antibioticUsage}</p>
            </div>
          )}
        </div>
      )
    }

    // Step 6: Antibiotics list (only if yes)
    if (currentStep === 6) {
      return (
        <div className="mb-5">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-0">
              <div className="min-w-0 self-start sm:self-center">
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-title font-bold text-primary mb-5 sm:mb-0">Which antibiotics did you take?</h3>
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
                      className="absolute -right-2 -top-2 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200 z-10"
                      style={{ backgroundColor: 'var(--text-cadet-blue)' }}
                      title="Remove item"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Medication"
                      value={item.medication}
                      onChange={(e) => updateAntibiotic(index, 'medication', e.target.value)}
                      className="input-field-wizard w-full sm:flex-1 min-w-0"
                    />
                    <DatePicker
                      ref={(el) => { antibioticDatePickerRefs.current[index] = el }}
                      selected={item.date}
                      onChange={(date) => updateAntibiotic(index, 'date', date)}
                      placeholderText="Select date taken"
                      customInput={<MedicationDateInput forcePlaceholder={!item.dateTouched} onIconClick={() => antibioticDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      preventOpenOnFocus
                      wrapperClassName="w-full sm:w-auto sm:flex-initial min-w-0"
                      enableTabLoop={false}
                    />
                    <select
                      value={item.timeOfDay}
                      onChange={(e) => updateAntibiotic(index, 'timeOfDay', e.target.value)}
                      className={`input-field-wizard w-full sm:flex-1 min-w-0 ${item.timeOfDay ? 'has-value' : 'placeholder'}`}
                    >
                      <option value="">Select time of day</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="50mg"
                      value={item.dosage}
                      onChange={(e) => updateAntibiotic(index, 'dosage', e.target.value)}
                      maxLength={5}
                      className="input-field-wizard w-full sm:w-20 flex-1 sm:flex-initial min-w-0"
                      autoComplete="off"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Validation error message */}
            {fieldErrors.antibioticList && (
              <div className="mt-6 p-3 rounded-lg border" style={{backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)'}}>
                <p className="text-sm" style={{color: 'var(--text-error)'}}>{fieldErrors.antibioticList}</p>
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
        <div className="space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold font-title text-primary">
            Review your entry
          </h2>

          {/* Missed Medications */}
          {(formData.missedMedications && formData.missedMedicationsList.filter(item => item.medication.trim()).length > 0) && (
            <div className="card border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Missed Medications</h3>
              <div className="space-y-3">
                {formData.missedMedicationsList.filter(item => item.medication.trim()).map((item, index, array) => (
                  <div key={index} className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${index < array.length - 1 ? 'border-b pb-3' : ''}`} style={index < array.length - 1 ? {borderColor: 'var(--separator-card)'} : {}}>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Medication</span>
                      <span className="text-sm sm:text-base font-medium text-primary truncate block" title={item.medication}>{item.medication}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Date</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Time of Day</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NSAIDs */}
          {(formData.nsaidUsage && formData.nsaidList.filter(item => item.medication.trim()).length > 0) && (
            <div className="card border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>NSAIDs</h3>
              <div className="space-y-3">
                {formData.nsaidList.filter(item => item.medication.trim()).map((item, index, array) => (
                  <div key={index} className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${index < array.length - 1 ? 'border-b pb-3' : ''}`} style={index < array.length - 1 ? {borderColor: 'var(--separator-card)'} : {}}>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Medication</span>
                      <span className="text-sm sm:text-base font-medium text-primary truncate block" title={item.medication}>{item.medication}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Dosage</span>
                      <span className="text-sm sm:text-base font-medium text-primary block">{item.dosage ? `${item.dosage}mg` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Date</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Time of Day</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Antibiotics */}
          {(formData.antibioticUsage && formData.antibioticList.filter(item => item.medication.trim()).length > 0) && (
            <div className="card border" style={{borderColor: 'var(--border-card)'}}>
              <h3 className="text-sm sm:text-lg font-semibold text-cadet-blue mb-4 pb-4 border-b" style={{borderColor: 'var(--separator-card)'}}>Antibiotics</h3>
              <div className="space-y-3">
                {formData.antibioticList.filter(item => item.medication.trim()).map((item, index, array) => (
                  <div key={index} className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${index < array.length - 1 ? 'border-b pb-3' : ''}`} style={index < array.length - 1 ? {borderColor: 'var(--separator-card)'} : {}}>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Medication</span>
                      <span className="text-sm sm:text-base font-medium text-primary truncate block" title={item.medication}>{item.medication}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-cadet-blue block mb-1">Dosage</span>
                      <span className="text-sm sm:text-base font-medium text-primary block">{item.dosage ? `${item.dosage}mg` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Date</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-cadet-blue block mb-1">Time of Day</span>
                      <span className="text-sm sm:text-base font-medium text-primary">{item.timeOfDay || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const wizardPhaseNames = medicationWizardProgress.phaseNames

  return (
    <div
      className={`medications-wizard max-w-4xl w-full mx-auto min-w-0 flex flex-col justify-center sm:min-h-[500px] ${
        currentStep > 0
          ? currentStep === 7
            ? 'pb-28 lg:pb-10'
            : 'pb-28 lg:pb-0'
          : ''
      }`}
    >
      {/* Header: exit to medications + section breadcrumb — hide on landing */}
      {currentStep > 0 && (
        <div className="min-w-0 w-full max-w-full pt-0 mb-6 md:mb-8">
          {medicationWizardProgress.total > 0 && (
            <div className="w-full min-w-0 max-w-full">
              <span id="medication-wizard-step-status" className="sr-only">
                Step {medicationWizardProgress.step} of {medicationWizardProgress.total}. Current section:{' '}
                {medicationWizardProgress.currentPhaseLabel}.
              </span>
              <nav
                ref={phaseBreadcrumbNavRef}
                aria-describedby="medication-wizard-step-status"
                className={[
                  'flex w-full min-w-0 max-w-full items-center gap-x-1 gap-y-1 text-sm sm:text-base leading-snug',
                  // Narrow viewports: one row, horizontal scroll — full labels, same type scale as sm+.
                  'scrollbar-hide max-md:flex-nowrap max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:touch-pan-x max-md:scroll-smooth max-md:pb-0.5 max-md:-mx-1 max-md:px-1',
                  // md and up: wrap inside the content width (no scroll strip).
                  'md:flex-wrap md:overflow-x-visible md:overflow-y-visible md:mx-0 md:px-0 md:touch-auto',
                ].join(' ')}
                style={{ WebkitOverflowScrolling: 'touch' }}
                aria-label="Wizard sections"
              >
                {wizardPhaseNames.map((label, i) => {
                  const entryStep = medicationWizardProgress.phaseEntrySteps[i]
                  const isCurrent = label === medicationWizardProgress.currentPhaseLabel
                  const canGo = typeof entryStep === 'number' && entryStep <= currentStep
                  return (
                    <Fragment key={`${label}-${i}`}>
                      {i > 0 && (
                        <ChevronRight
                          className={[
                            'w-4 h-4 shrink-0 self-center',
                            canGo ? 'text-muted' : 'text-muted opacity-35',
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
                          i === 0 ? 'pl-1' : '',
                          isCurrent
                            ? 'font-semibold text-cadet-blue'
                            : 'font-normal text-muted',
                          canGo && !isCurrent
                            ? 'hover:text-cadet-blue hover:underline cursor-pointer'
                            : '',
                          !canGo ? 'opacity-35 cursor-not-allowed' : '',
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
            {/* Icon - same as home page medications card */}
            <div className="w-14 h-14 bg-white dark:bg-[var(--bg-icon-container)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <ChartLine className="w-7 h-7 text-pink-600 dark:[color:var(--text-goal-icon-medication)]" />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4 sm:mb-5">Log Medications</h2>
            
            {/* Optional description */}
            <p className="text-base font-sans text-muted mb-6 max-w-md">Track your medication adherence to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="button-cadet btn-size-md flex-shrink-0 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors inline-flex items-center justify-center font-sans"
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
          <div className="flex justify-start items-center mt-6">
            {currentStep < 7 ? (
              <button
                onClick={nextStep}
                className="button-cadet btn-size-md px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="button-cadet btn-size-md inline-flex min-w-[7.25rem] items-center justify-center px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Cancel modal */}
      <ConfirmationModal
        isOpen={showNoDataModal}
        onClose={() => {
          // Go back to step 0 (start)
          setCurrentStep(0)
          setShowNoDataModal(false)
        }}
        onConfirm={() => {
          // Go back to step 0 (start) - same as cancel
          setCurrentStep(0)
          setShowNoDataModal(false)
        }}
        title="No Tracking Data Entered"
        message="You must add at least one medication in order to log this entry."
        confirmText="Back to Start"
        cancelText=""
        isDestructive={false}
      />

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handlePatternModalCancel}
        title="Cancel logging?"
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

