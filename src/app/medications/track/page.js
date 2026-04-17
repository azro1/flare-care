'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ChartLine, Calendar, Loader2, MessageCircle } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'

const MedicationDateInput = forwardRef(({ value, onClick, onChange, placeholder, id, className, onIconClick, ...rest }, ref) => (
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
MedicationDateInput.displayName = 'MedicationDateInput'

function MedicationTrackingWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const CHAT_STORAGE_KEYS = {
    mode: 'medication-chat-mode',
    messages: 'medication-chat-messages',
    draft: 'medication-chat-draft',
    status: 'medication-chat-status',
    missingFields: 'medication-chat-missing-fields',
    warnings: 'medication-chat-warnings',
    readyMessage: 'medication-chat-ready-message',
    restoreOnce: 'medication-chat-restore-once',
  }

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
        missedMedicationsList: [{ medication: '', date: new Date(), timeOfDay: '' }],
        nsaidUsage: false,
        nsaidList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '' }],
        antibioticUsage: false,
        antibioticList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '' }]
      }
    }
    return {
      missedMedications: false,
      missedMedicationsList: [{ medication: '', date: new Date(), timeOfDay: '' }],
      nsaidUsage: false,
      nsaidList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '' }],
      antibioticUsage: false,
      antibioticList: [{ medication: '', date: new Date(), timeOfDay: '', dosage: '' }]
    }
  })

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showNoDataModal, setShowNoDataModal] = useState(false)
  const [dateErrors, setDateErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [entryMode, setEntryMode] = useState('wizard')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatDraft, setChatDraft] = useState({
    missedMedications: [],
    nsaids: [],
    antibiotics: [],
    meta: { stage: 'missed_yes_no', skipped: { missed: false, nsaid: false, antibiotic: false }, currentEntry: {} },
  })
  const [chatStatus, setChatStatus] = useState('needs_more_info')
  const [chatMissingFields, setChatMissingFields] = useState([])
  const [chatWarnings, setChatWarnings] = useState([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatReadyMessage, setChatReadyMessage] = useState('')
  const chatScrollRef = useRef(null)
  const chatHydratedRef = useRef(false)
  const enableMedicationChat = process.env.NEXT_PUBLIC_ENABLE_MEDICATION_CHATBOT === 'true'
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const missedMedDatePickerRefs = useRef({})
  const nsaidDatePickerRefs = useRef({})
  const antibioticDatePickerRefs = useRef({})

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

  // Hydrate chat state from localStorage on mount, but only when explicitly marked for restore (refresh).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const shouldRestore = localStorage.getItem(CHAT_STORAGE_KEYS.restoreOnce) === 'true'
      if (!shouldRestore) {
        localStorage.removeItem(CHAT_STORAGE_KEYS.mode)
        localStorage.removeItem(CHAT_STORAGE_KEYS.messages)
        localStorage.removeItem(CHAT_STORAGE_KEYS.draft)
        localStorage.removeItem(CHAT_STORAGE_KEYS.status)
        localStorage.removeItem(CHAT_STORAGE_KEYS.missingFields)
        localStorage.removeItem(CHAT_STORAGE_KEYS.warnings)
        localStorage.removeItem(CHAT_STORAGE_KEYS.readyMessage)
        chatHydratedRef.current = true
        return
      }

      const savedMode = localStorage.getItem(CHAT_STORAGE_KEYS.mode)
      if (savedMode === 'chat' || savedMode === 'wizard') {
        setEntryMode(savedMode)
      }

      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEYS.messages)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)
        if (Array.isArray(parsed)) setChatMessages(parsed)
      }

      const savedDraft = localStorage.getItem(CHAT_STORAGE_KEYS.draft)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed && typeof parsed === 'object') setChatDraft(parsed)
      }

      const savedStatus = localStorage.getItem(CHAT_STORAGE_KEYS.status)
      if (savedStatus) setChatStatus(savedStatus)

      const savedMissing = localStorage.getItem(CHAT_STORAGE_KEYS.missingFields)
      if (savedMissing) {
        const parsed = JSON.parse(savedMissing)
        if (Array.isArray(parsed)) setChatMissingFields(parsed)
      }

      const savedWarnings = localStorage.getItem(CHAT_STORAGE_KEYS.warnings)
      if (savedWarnings) {
        const parsed = JSON.parse(savedWarnings)
        if (Array.isArray(parsed)) setChatWarnings(parsed)
      }

      const savedReadyMessage = localStorage.getItem(CHAT_STORAGE_KEYS.readyMessage)
      if (savedReadyMessage) setChatReadyMessage(savedReadyMessage)

      // One-time restore only (refresh). Do not keep restoring across normal navigation.
      localStorage.removeItem(CHAT_STORAGE_KEYS.restoreOnce)
    } catch (error) {
      console.warn('Failed to restore medication chat state:', error)
    }
    // Unlock persistence after hydration has applied to state.
    setTimeout(() => {
      chatHydratedRef.current = true
    }, 0)
  }, [])

  // Mark current chat state for one-time restore on page refresh/unload.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const persistForRefresh = () => {
      try {
        localStorage.setItem(CHAT_STORAGE_KEYS.restoreOnce, 'true')
        localStorage.setItem(CHAT_STORAGE_KEYS.mode, entryMode)
        localStorage.setItem(CHAT_STORAGE_KEYS.messages, JSON.stringify(chatMessages))
        localStorage.setItem(CHAT_STORAGE_KEYS.draft, JSON.stringify(chatDraft))
        localStorage.setItem(CHAT_STORAGE_KEYS.status, chatStatus)
        localStorage.setItem(CHAT_STORAGE_KEYS.missingFields, JSON.stringify(chatMissingFields))
        localStorage.setItem(CHAT_STORAGE_KEYS.warnings, JSON.stringify(chatWarnings))
        localStorage.setItem(CHAT_STORAGE_KEYS.readyMessage, chatReadyMessage || '')
      } catch (error) {
        console.warn('Failed to persist medication chat state:', error)
      }
    }

    window.addEventListener('beforeunload', persistForRefresh)
    window.addEventListener('pagehide', persistForRefresh)

    return () => {
      window.removeEventListener('beforeunload', persistForRefresh)
      window.removeEventListener('pagehide', persistForRefresh)
    }
  }, [entryMode, chatMessages, chatDraft, chatStatus, chatMissingFields, chatWarnings, chatReadyMessage])

  // Keep chat pinned to latest message
  useEffect(() => {
    if (entryMode !== 'chat') return
    const container = chatScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [chatMessages, isChatLoading, entryMode])

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

  // ✅ Prevent body scrolling only on wizard landing page
  useEffect(() => {
    // Apply fixed positioning only on manual wizard landing page (step 0)
    if (currentStep === 0 && entryMode === 'wizard') {
      // Freeze scroll
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
    
      // Apply gradient to html element since body is fixed
      // Use CSS variable to respect light/dark mode
      const bgMain = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim()
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.background = bgMain || '#f8fafc' // Fallback to light mode default
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
  }, [currentStep, entryMode])

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

  // Dosage: digits only; we add "mg" when saving and displaying
  const normalizeDosage = (raw) => (raw || '').replace(/\D/g, '').slice(0, 5)
  const formatDateUk = (value) => {
    if (!value) return 'N/A'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const toDateOrToday = (value) => {
    const d = value ? new Date(value) : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  }

  const mapChatDraftToCleanedData = (draft) => ({
    missedMedicationsList: (draft?.missedMedications || [])
      .map((item) => ({
        medication: item.medicationName || '',
        date: toDateOrToday(item.date),
        timeOfDay: item.time || '',
      }))
      .filter((item) => item.medication.trim()),
    nsaidList: (draft?.nsaids || [])
      .map((item) => ({
        medication: item.name || '',
        date: toDateOrToday(item.date),
        timeOfDay: item.time || '',
        dosage: normalizeDosage(item.dose),
      }))
      .filter((item) => item.medication.trim()),
    antibioticList: (draft?.antibiotics || [])
      .map((item) => ({
        medication: item.name || '',
        date: toDateOrToday(item.date),
        timeOfDay: item.time || '',
        dosage: normalizeDosage(item.dose),
      }))
      .filter((item) => item.medication.trim()),
  })

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
    localStorage.removeItem(CHAT_STORAGE_KEYS.mode)
    localStorage.removeItem(CHAT_STORAGE_KEYS.messages)
    localStorage.removeItem(CHAT_STORAGE_KEYS.draft)
    localStorage.removeItem(CHAT_STORAGE_KEYS.status)
    localStorage.removeItem(CHAT_STORAGE_KEYS.missingFields)
    localStorage.removeItem(CHAT_STORAGE_KEYS.warnings)
    localStorage.removeItem(CHAT_STORAGE_KEYS.readyMessage)
    localStorage.setItem('showMedicationToast', 'true')
    router.push('/')
    return true
  }

  // Missed medications list handlers
  const addMissedMedication = () => {
    setFormData(prev => ({
      ...prev,
      missedMedicationsList: [...prev.missedMedicationsList, { medication: '', date: new Date(), timeOfDay: '' }]
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
      nsaidList: [...prev.nsaidList, { medication: '', date: new Date(), timeOfDay: '', dosage: '' }]
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
    setFormData(prev => ({
      ...prev,
      nsaidList: prev.nsaidList.map((item, i) =>
        i === index ? { ...item, [field]: safeValue } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        nsaidList: formData.nsaidList.map((item, i) =>
          i === index ? { ...item, [field]: safeValue } : item
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
      antibioticList: [...prev.antibioticList, { medication: '', date: new Date(), timeOfDay: '', dosage: '' }]
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
    setFormData(prev => ({
      ...prev,
      antibioticList: prev.antibioticList.map((item, i) =>
        i === index ? { ...item, [field]: safeValue } : item
      )
    }))
    
    // Clear error if validation now passes
    setTimeout(() => {
      const newFormData = {
        ...formData,
        antibioticList: formData.antibioticList.map((item, i) =>
          i === index ? { ...item, [field]: safeValue } : item
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

  const addChatMessage = (role, content) => {
    if (!content) return
    setChatMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content }])
  }

  const sendChatTurn = async (message, options = {}) => {
    const { immediate = false } = options
    if (!immediate) {
      setIsChatLoading(true)
    }
    setChatError('')
    try {
      const response = await fetch('/api/ai/medication-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `medication-chat-${user?.id || 'anon'}`,
          userMessage: message,
          draft: chatDraft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Medication chat failed.')
      }

      setChatDraft(data?.draft || chatDraft)
      setChatMissingFields(Array.isArray(data?.missingFields) ? data.missingFields : [])
      setChatWarnings(Array.isArray(data?.warnings) ? data.warnings : [])
      const nextStatus = data?.status || 'needs_more_info'
      // Small delay so assistant replies feel conversational (except initial prompt).
      if (!immediate) {
        await sleep(500)
      }
      if (nextStatus === 'ready_for_review') {
        setChatReadyMessage(data?.assistantMessage || 'Thanks — review what we captured below, then confirm to save.')
        setChatStatus('ready_for_review')
      } else {
        addChatMessage('assistant', data?.assistantMessage || 'I updated your draft. Continue when ready.')
        setChatStatus(nextStatus)
      }
    } catch (error) {
      console.error('Medication chat request failed:', error)
      setChatError('Medication chatbot is unavailable right now. You can continue using the manual form.')
    } finally {
      if (!immediate) {
        setIsChatLoading(false)
      }
    }
  }

  const startChatMode = async () => {
    setEntryMode('chat')
    setChatMessages([])
    setChatInput('')
    setChatDraft({
      missedMedications: [],
      nsaids: [],
      antibiotics: [],
      meta: { stage: 'missed_yes_no', skipped: { missed: false, nsaid: false, antibiotic: false }, currentEntry: {} },
    })
    setChatStatus('needs_more_info')
    setChatReadyMessage('')
    setChatMissingFields([])
    setChatWarnings([])
    await sendChatTurn('', { immediate: true })
  }

  const submitChatMessage = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || isChatLoading) return
    addChatMessage('user', trimmed)
    setChatInput('')
    await sendChatTurn(trimmed)
  }

  const handleChatSubmit = async () => {
    if (isSubmitting || chatStatus !== 'ready_for_review') return
    setIsSubmitting(true)
    try {
      const cleanedData = mapChatDraftToCleanedData(chatDraft)
      await saveMedicationTracking(cleanedData)
    } catch (error) {
      console.error('Error saving medication tracking from chat:', error)
      setIsSubmitting(false)
    }
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
                      placeholderText="Select date missed"
                      customInput={<MedicationDateInput onIconClick={() => missedMedDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
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
                      customInput={<MedicationDateInput onIconClick={() => nsaidDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
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
                      customInput={<MedicationDateInput onIconClick={() => antibioticDatePickerRefs.current?.[index]?.setOpen?.(true)} />}
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

  return (
    <div className={`medications-wizard max-w-4xl w-full mx-auto sm:px-4 md:px-6 lg:px-8 min-w-0 flex flex-col justify-center sm:flex-grow ${(currentStep > 0 || entryMode === 'chat') ? 'pb-28 lg:pb-0' : ''}`}>
      {/* Header: Back when needed, then title - hide on landing */}
      {currentStep > 0 && (
        <div className="pt-6 md:pt-0 mb-8">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="text-cadet-blue hover:text-cadet-blue/80 hover:underline text-base font-medium flex items-center mb-3"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentStep(0)}
            className="text-sm sm:text-base font-normal text-primary underline hover:opacity-80 transition-opacity text-left"
          >
            Log Medications
          </button>
        </div>
      )}

      {/* Wizard Container */}
      <div className="mb-4">
        {/* Step 0: Landing Page */}
        {currentStep === 0 && entryMode === 'wizard' && (
          <div className="flex flex-col items-center justify-center text-center pt-20 sm:pt-0">
            {/* Icon - same as home page medications card */}
            <div className="w-14 h-14 bg-white dark:bg-[var(--bg-icon-container)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <ChartLine className="w-7 h-7 text-pink-600 dark:[color:var(--text-goal-icon-medication)]" />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4 sm:mb-6">Log Medications</h2>
            
            {/* Optional description */}
            <p className="text-base sm:text-lg font-sans text-muted mb-6 max-w-md">Track your medication adherence to identify patterns and triggers</p>
            
            {/* Start button */}
            <button
              onClick={nextStep}
              className="button-cadet px-4 py-2 text-base sm:text-lg font-semibold tracking-wide rounded-lg transition-colors"
            >
              Start now
            </button>
            {enableMedicationChat && (
              <button
                onClick={startChatMode}
                className="mt-3 px-4 py-2 text-base sm:text-lg font-semibold rounded-lg border border-cadet-blue text-cadet-blue hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                FlareBot (Beta)
              </button>
            )}
          </div>
        )}

        {currentStep === 0 && entryMode === 'chat' && chatStatus !== 'ready_for_review' && (
          <div className="card border" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-title font-bold text-primary inline-flex items-start sm:items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-cadet-blue" />
                  FlareBot (Beta)
                </h3>
                <button
                  type="button"
                  className="text-sm text-cadet-blue underline hover:opacity-80"
                  onClick={() => setEntryMode('wizard')}
                >
                  Log Medications
                </button>
              </div>

              <p className="text-sm text-muted mb-4">
                This test bot helps you log missed medications, NSAIDs, and antibiotics. You will review before saving.
              </p>

              <div
                ref={chatScrollRef}
                className="rounded-lg border p-3 h-72 overflow-y-auto space-y-3 mb-4"
                style={{ borderColor: 'var(--border-card)' }}
              >
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role !== 'user' && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 card-inner"
                          style={{
                            color: 'var(--text-icon)',
                          }}
                          aria-hidden
                        >
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-full px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'text-white'
                            : 'text-primary card-inner'
                        }`}
                        style={msg.role === 'user'
                          ? { backgroundColor: 'var(--text-cadet-blue)' }
                          : undefined}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-[92%]">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 card-inner"
                        style={{ color: 'var(--text-icon)' }}
                        aria-hidden
                      >
                        🤖
                      </div>
                      <div className="card-inner px-3 py-2 rounded-lg inline-flex items-center gap-1" aria-label="Bot is typing">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-cadet-blue)', animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-cadet-blue)', animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-cadet-blue)', animationDelay: '240ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitChatMessage()
                    }
                  }}
                  placeholder="Type your answer..."
                  className="input-field-wizard flex-1"
                  disabled={isChatLoading}
                />
                <button
                  type="button"
                  onClick={submitChatMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className={`px-4 py-2 rounded-lg font-semibold border ${isChatLoading || !chatInput.trim() ? 'button-disabled' : 'button-cadet'}`}
                  style={isChatLoading || !chatInput.trim()
                    ? {
                        backgroundColor: 'var(--bg-button-disabled)',
                        color: 'var(--text-button-disabled)',
                        border: '1px solid var(--border-input-dark)',
                      }
                    : {
                        border: '1px solid var(--bg-button-cadet)',
                      }}
                >
                  Send
                </button>
              </div>

              {chatError && (
                <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-error)' }}>{chatError}</p>
                </div>
              )}

              {chatWarnings.length > 0 && (
                <div className="mb-0 p-3 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
                  {chatWarnings.map((warning, index) => (
                    <p key={`${warning}-${index}`} className="text-sm text-muted">{warning}</p>
                  ))}
                </div>
              )}
          </div>
        )}

        {currentStep === 0 && entryMode === 'chat' && chatStatus === 'ready_for_review' && (
          <div className="card border" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-title font-bold text-primary inline-flex items-start sm:items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-cadet-blue" />
                  Review captured entries
                </h3>
                <button
                  type="button"
                  className="text-sm text-cadet-blue underline hover:opacity-80"
                  onClick={() => setEntryMode('wizard')}
                >
                  Log Medications
                </button>
              </div>

              {chatReadyMessage && (
                <p className="text-sm text-muted mb-4">{chatReadyMessage}</p>
              )}

              <div className="space-y-4 mb-4">
                <div className="text-sm text-secondary">
                  {chatDraft.missedMedications.length === 0 && chatDraft.nsaids.length === 0 && chatDraft.antibiotics.length === 0
                    ? 'No entries captured yet.'
                    : 'Draft data captured from chat:'}
                </div>

                {chatDraft.missedMedications.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-cadet-blue mb-1">Missed medications</h5>
                    <ul className="space-y-1 text-sm text-primary">
                      {chatDraft.missedMedications.map((item, index) => (
                        <li key={`missed-${index}`}>- {item.medicationName} on {formatDateUk(item.date)} ({item.time})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {chatDraft.nsaids.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-cadet-blue mb-1">NSAIDs</h5>
                    <ul className="space-y-1 text-sm text-primary">
                      {chatDraft.nsaids.map((item, index) => (
                        <li key={`nsaid-${index}`}>- {item.name} {item.dose ? `${item.dose}mg` : ''} on {formatDateUk(item.date)} ({item.time})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {chatDraft.antibiotics.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-cadet-blue mb-1">Antibiotics</h5>
                    <ul className="space-y-1 text-sm text-primary">
                      {chatDraft.antibiotics.map((item, index) => (
                        <li key={`antibiotic-${index}`}>- {item.name} {item.dose ? `${item.dose}mg` : ''} on {formatDateUk(item.date)} ({item.time})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {chatMissingFields.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-error)', borderColor: 'var(--border-error)' }}>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-error)' }}>
                    Missing required fields before review:
                  </p>
                  <ul className="text-sm list-disc ml-5" style={{ color: 'var(--text-error)' }}>
                    {chatMissingFields.map((field) => (
                      <li key={field.path}>{field.path}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={handleChatSubmit}
                disabled={isSubmitting}
                className={`inline-flex min-w-[8rem] items-center justify-center px-4 py-2 rounded-lg font-semibold border ${isSubmitting ? 'button-disabled' : 'button-cadet'}`}
                style={isSubmitting
                  ? {
                      backgroundColor: 'var(--bg-button-disabled)',
                      color: 'var(--text-button-disabled)',
                      border: '1px solid var(--border-input-dark)',
                    }
                  : {
                      border: '1px solid var(--bg-button-cadet)',
                    }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    <span className="sr-only">Submitting</span>
                  </>
                ) : (
                  'Confirm save'
                )}
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
          <div className={`flex justify-start items-center ${currentStep === 7 ? 'mt-6 mb-6 sm:mb-0' : 'mt-6'}`}>
            {currentStep < 7 ? (
              <button
                onClick={nextStep}
                className="button-cadet px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="button-cadet inline-flex min-w-[7.25rem] items-center justify-center px-4 py-2 text-base sm:text-lg font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

