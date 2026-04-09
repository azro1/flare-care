'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import jsPDF from 'jspdf'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import DateInputWithCalendar from '@/components/DateInputWithCalendar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { getUserPreferences } from '@/lib/userPreferences'
import { formatBristolLine } from '@/lib/bristolStoolChart'
import { Calendar, FileText, Download, FileDown, BarChart3, Pill, Activity, TrendingUp, Thermometer, Brain, Pizza, ChartLine, Scale, CupSoda, Mail, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

// Force dynamic rendering to prevent Vercel static generation issues
export const dynamic = 'force-dynamic'

const REPORT_PAGE_SIZE = 20

/** Local calendar date DD/MM/YYYY from an ISO instant — matches bowel / weight logs */
function formatUKDateFromOccurredAt(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Local time HH:mm from an ISO instant — matches bowel log list */
function formatUKTimeFromOccurredAt(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** PDF/CSV/email: bowel tri-state booleans */
function formatBowelYesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '—'
}

function ReportsPageContent() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [symptoms, setSymptoms] = useState([])
  const [medications, setMedications] = useState([])
  const [medicationTracking, setMedicationTracking] = useState([])
  const [appointments, setAppointments] = useState([])
  const [weightEntries, setWeightEntries] = useState([])
  const [hydrationEntries, setHydrationEntries] = useState([])
  const [bowelMovementLogs, setBowelMovementLogs] = useState([])
  const [reportData, setReportData] = useState(null)
  const [userPreferences, setUserPreferences] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  })
  const [showNoDataModal, setShowNoDataModal] = useState(false)
  /** Same modal as export; copy differs when opened from Email report */
  const [noDataModalIsEmail, setNoDataModalIsEmail] = useState(false)

  const [listPages, setListPages] = useState({
    symptomEpisodes: 0,
    missedMeds: 0,
    nsaids: 0,
    antibiotics: 0
  })
  const setListPage = (key, page) => setListPages(prev => ({ ...prev, [key]: Math.max(0, page) }))

  const [expandedSections, setExpandedSections] = useState({
    symptoms: false,
    symptomEpisodes: false,
    currentMeds: false,
    medicationLogs: false,
    appointments: false,
    weightLogs: false,
    hydration: false,
    bowelMovements: false,
    topFoods: false
  })
  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const reportStartDatePickerRef = useRef(null)
  const reportEndDatePickerRef = useRef(null)
  const [emailForm, setEmailForm] = useState({
    consultantEmail: '',
    consultantName: '',
    note: ''
  })
  const [emailError, setEmailError] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailSentToast, setShowEmailSentToast] = useState(false)
  const [emailToastPortalReady, setEmailToastPortalReady] = useState(false)
  const emailSentToastTimerRef = useRef(null)

  useEffect(() => {
    setEmailToastPortalReady(true)
    return () => {
      if (emailSentToastTimerRef.current) {
        clearTimeout(emailSentToastTimerRef.current)
        emailSentToastTimerRef.current = null
      }
    }
  }, [])

  const openEmailModal = () => {
    if (!hasDataToExport() || !reportData) {
      setNoDataModalIsEmail(true)
      setShowNoDataModal(true)
      return
    }
    setEmailError('')
    setIsEmailModalOpen(true)
  }

  const closeEmailModal = () => {
    if (isSendingEmail) return
    setIsEmailModalOpen(false)
  }

  const handleEmailFormChange = (event) => {
    const { name, value } = event.target
    setEmailForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSendReportEmail = async (event) => {
    event.preventDefault()
    if (!reportData) return

    const email = emailForm.consultantEmail.trim()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setIsSendingEmail(true)
    setEmailError('')

    try {
      // Build detailed symptoms for email (same overlap logic as PDF export)
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      const detailedSymptomsForEmail = (symptoms || [])
        .filter(symptom => {
          const symptomStartDate = new Date(symptom.symptomStartDate)
          const symptomEndDate = symptom.symptomEndDate ? new Date(symptom.symptomEndDate) : new Date()
          return (symptomStartDate <= endDate && symptomEndDate >= startDate)
        })
        .sort((a, b) => new Date(a.symptomStartDate) - new Date(b.symptomStartDate))
        .map(symptom => ({
          symptomStartDate: symptom.symptomStartDate,
          symptomEndDate: symptom.symptomEndDate,
          isOngoing: !!symptom.isOngoing,
          severity: symptom.severity,
          stress_level: symptom.stress_level,
          notes: symptom.notes,
          smoking: symptom.smoking,
          smoking_details: symptom.smoking_details,
          alcohol: symptom.alcohol,
          alcohol_units: symptom.alcohol_units,
          normal_bathroom_frequency: symptom.normal_bathroom_frequency,
          bathroom_frequency_changed: symptom.bathroom_frequency_changed,
          bathroom_frequency_change_details: symptom.bathroom_frequency_change_details,
          breakfast: symptom.breakfast,
          lunch: symptom.lunch,
          dinner: symptom.dinner,
          foods: symptom.foods,
        }))

      const response = await fetch('/api/send-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantEmail: email,
          consultantName: emailForm.consultantName.trim() || null,
          note: emailForm.note.trim() || null,
          period: reportData.period,
          prefs: {
            isSmoker: userPreferences?.isSmoker,
            isDrinker: userPreferences?.isDrinker,
          },
          detailedSymptoms: detailedSymptomsForEmail,
          summary: {
            totalEntries: reportData.totalEntries,
            averageSeverity: reportData.averageSeverity,
            severityTrend: reportData.severityTrend,
            topFoods: reportData.topFoods,
            medications: reportData.medications,
            medicationTracking: reportData.medicationTracking,
            appointments: reportData.appointments,
            weightEntries: reportData.weightEntries,
            hydrationEntries: reportData.hydrationEntries,
            hydrationTarget: reportData.hydrationTarget,
            bowelMovementEntries: reportData.bowelMovementEntries
          }
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send email. Please try again.'
        try {
          const data = await response.json()
          if (data?.error) errorMessage = data.error
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage)
      }

      setIsEmailModalOpen(false)
      setEmailForm({ consultantEmail: '', consultantName: '', note: '' })
      if (emailSentToastTimerRef.current) {
        clearTimeout(emailSentToastTimerRef.current)
      }
      setShowEmailSentToast(true)
      emailSentToastTimerRef.current = setTimeout(() => {
        setShowEmailSentToast(false)
        emailSentToastTimerRef.current = null
      }, 4000)
    } catch (error) {
      console.error('Error sending report email:', error)
      setEmailError(error.message || 'Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

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
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              symptomStartDate: symptom_start_date,
              isOngoing: is_ongoing,
              symptomEndDate: symptom_end_date,
              createdAt: created_at,
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

  // Fetch medications directly from Supabase
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.id) {
        setMedications([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          // Transform snake_case to camelCase
          const transformedMedications = data.map(item => {
            const {
              time_of_day,
              reminders_enabled,
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              timeOfDay: time_of_day || '',
              remindersEnabled: reminders_enabled !== false,
              createdAt: created_at,
              updatedAt: updated_at
            }
          })
          setMedications(transformedMedications)
        }
      } catch (error) {
        console.error('Error fetching medications:', error)
        setMedications([])
      }
    }

    fetchMedications()
  }, [user?.id])

  // Fetch medication tracking directly from Supabase
  useEffect(() => {
    const fetchMedicationTracking = async () => {
      if (!user?.id) {
        setMedicationTracking([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.LOG_MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          setMedicationTracking(data || [])
        }
      } catch (error) {
        console.error('Error fetching medication tracking:', error)
        setMedicationTracking([])
      }
    }

    fetchMedicationTracking()
  }, [user?.id])

  // Fetch user preferences (isSmoker, isDrinker) for export labels
  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user?.id) {
        setUserPreferences(null)
        return
      }
      const prefs = await getUserPreferences(user.id)
      setUserPreferences(prefs)
    }
    fetchPrefs()
  }, [user?.id])

  // Fetch appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id) {
        setAppointments([])
        return
      }
      try {
        const { data, error } = await supabase
          .from(TABLES.APPOINTMENTS)
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })

        if (error) throw error
        setAppointments(data || [])
      } catch (error) {
        console.error('Error fetching appointments:', error)
        setAppointments([])
      }
    }
    fetchAppointments()
  }, [user?.id])

  // Fetch weight entries from Supabase
  useEffect(() => {
    const fetchWeight = async () => {
      if (!user?.id) {
        setWeightEntries([])
        return
      }
      try {
        const { data, error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })

        if (error) throw error
        setWeightEntries(data || [])
      } catch (error) {
        console.error('Error fetching weight entries:', error)
        setWeightEntries([])
      }
    }
    fetchWeight()
  }, [user?.id])

  // Fetch hydration entries from Supabase
  useEffect(() => {
    const fetchHydration = async () => {
      if (!user?.id) {
        setHydrationEntries([])
        return
      }
      try {
        const { data, error } = await supabase
          .from(TABLES.DAILY_HYDRATION)
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })

        if (error) throw error
        setHydrationEntries(data || [])
      } catch (error) {
        console.error('Error fetching hydration entries:', error)
        setHydrationEntries([])
      }
    }
    fetchHydration()
  }, [user?.id])

  useEffect(() => {
    const fetchBowel = async () => {
      if (!user?.id) {
        setBowelMovementLogs([])
        return
      }
      try {
        const { data, error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })

        if (error) throw error
        setBowelMovementLogs(data || [])
      } catch (error) {
        console.error('Error fetching bowel movements:', error)
        setBowelMovementLogs([])
      }
    }
    fetchBowel()
  }, [user?.id])

  // Reset loading when navigating to reports page
  useEffect(() => {
    if (pathname === '/reports') {
      setIsLoading(true)
      setReportData(null)
    }
  }, [pathname])

  // Generate report when data is ready
  useEffect(() => {
    if (user && pathname === '/reports') {
      generateReport()
    }
  }, [symptoms, medications, medicationTracking, appointments, weightEntries, hydrationEntries, bowelMovementLogs, dateRange, user, pathname])

  useEffect(() => {
    if (reportData) {
      setListPages({ symptomEpisodes: 0, missedMeds: 0, nsaids: 0, antibiotics: 0 })
    }
  }, [reportData?.period?.start, reportData?.period?.end])

  const generateReport = () => {
    // Filter symptoms by selected date range
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0) // Use epoch if no start date
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date() // Use today if no end date
    startDate.setHours(0, 0, 0, 0)
    // Include full end day: set to 23:59:59.999 so entries created on that day are included
    if (dateRange.endDate) {
      endDate.setHours(23, 59, 59, 999)
    }
    
    const allSymptoms = symptoms.filter(symptom => {
      const symptomStartDate = new Date(symptom.symptomStartDate)
      const symptomEndDate = symptom.symptomEndDate ? new Date(symptom.symptomEndDate) : new Date()
      
      // Check if symptom period overlaps with selected date range
      return (symptomStartDate <= endDate && symptomEndDate >= startDate)
    })

    // Calculate average severity
    const averageSeverity = allSymptoms.length > 0 
      ? (allSymptoms.reduce((sum, symptom) => sum + parseFloat(symptom.severity), 0) / allSymptoms.length).toFixed(1)
      : 0

    // Calculate average stress level
    const averageStress = allSymptoms.length > 0 
      ? (allSymptoms.reduce((sum, symptom) => sum + parseFloat(symptom.stress_level || 0), 0) / allSymptoms.length).toFixed(1)
      : 0

    // Get all foods logged (handle both old and new formats)
    const allFoods = allSymptoms
      .map(symptom => {
        const foods = []
        
        // New format: structured meals
        if (symptom.breakfast || symptom.lunch || symptom.dinner) {
          [...(symptom.breakfast || []), ...(symptom.lunch || []), ...(symptom.dinner || [])]
            .filter(item => item.food && item.food.trim())
            .forEach(item => {
              const foodEntry = item.quantity ? `${item.food} (${item.quantity})` : item.food
              foods.push(foodEntry)
            })
        }
        // Old format: comma-separated foods
        else if (symptom.foods && symptom.foods.trim()) {
          foods.push(...symptom.foods.split(',').map(food => food.trim()).filter(food => food.length > 0))
        }
        
        return foods
      })
      .flat()

    // Count food frequency
    const foodFrequency = allFoods.reduce((acc, food) => {
      acc[food] = (acc[food] || 0) + 1
      return acc
    }, {})

    // Sort foods by frequency
    const topFoods = Object.entries(foodFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    // Get symptom trends (sorted by start date)
    const severityTrend = allSymptoms
      .sort((a, b) => new Date(a.symptomStartDate) - new Date(b.symptomStartDate))
      .map(symptom => ({
        date: symptom.symptomStartDate,
        severity: symptom.severity,
        stressLevel: symptom.stress_level,
        isOngoing: symptom.isOngoing,
        endDate: symptom.symptomEndDate
      }))

    // Use the selected date range for the report period
    const reportStartDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date()
    const reportEndDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date()

    // Helper: true if item's date (when med was taken) falls within report range
    const itemDateInRange = (item) => {
      const raw = item.date ?? item.date_taken
      if (!raw) return false
      const d = new Date(raw)
      if (isNaN(d.getTime())) return false
      d.setHours(0, 0, 0, 0)
      return d >= startDate && d <= endDate
    }

    // Combine all medication tracking data from all entries, then filter by each item's date (when med was taken)
    const combinedMissedMedications = []
    const combinedNsaids = []
    const combinedAntibiotics = []

    medicationTracking.forEach(entry => {
      if (entry.missed_medications_list && Array.isArray(entry.missed_medications_list)) {
        combinedMissedMedications.push(...entry.missed_medications_list.filter(item => item.medication && item.medication.trim() && itemDateInRange(item)))
      }
      if (entry.nsaid_list && Array.isArray(entry.nsaid_list)) {
        combinedNsaids.push(...entry.nsaid_list.filter(item => item.medication && item.medication.trim() && itemDateInRange(item)))
      }
      if (entry.antibiotic_list && Array.isArray(entry.antibiotic_list)) {
        combinedAntibiotics.push(...entry.antibiotic_list.filter(item => item.medication && item.medication.trim() && itemDateInRange(item)))
      }
    })

    // Appointments: include all (no date restriction - info for whoever reads the report)
    const filteredAppointments = appointments
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(apt => ({
        date: apt.date,
        time: apt.time || '',
        type: apt.type || '',
        clinician_name: apt.clinician_name || '',
        location: apt.location || '',
        notes: apt.notes || ''
      }))

    // Weight: include all entries (no date restriction - info for whoever reads the report)
    const filteredWeight = weightEntries
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => ({
        date: entry.date,
        value_kg: entry.value_kg != null ? Number(entry.value_kg) : null,
        notes: entry.notes || ''
      }))

    // Hydration: filter by date range
    const HYDRATION_TARGET = 6
    const filteredHydration = hydrationEntries
      .filter(entry => {
        const d = new Date(entry.date)
        if (isNaN(d.getTime())) return false
        d.setHours(0, 0, 0, 0)
        return d >= startDate && d <= endDate
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => ({
        date: entry.date,
        glasses: entry.glasses ?? 0,
        targetMet: (entry.glasses ?? 0) >= HYDRATION_TARGET
      }))

    const filteredBowelMovements = bowelMovementLogs
      .filter((row) => {
        const t = row.occurred_at ? new Date(row.occurred_at) : null
        if (!t || Number.isNaN(t.getTime())) return false
        return t >= startDate && t <= endDate
      })
      .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
      .map((row) => ({
        occurredAt: row.occurred_at,
        bristolType: row.bristol_type,
        blood: row.blood,
        strain: row.strain,
        urgency: row.urgency,
        notes: row.notes || ''
      }))
    
    setReportData({
      period: {
        start: reportStartDate.toISOString().split('T')[0],
        end: reportEndDate.toISOString().split('T')[0]
      },
      averageSeverity: parseFloat(averageSeverity),
      averageStress: parseFloat(averageStress),
      totalEntries: allSymptoms.length,
      topFoods,
      severityTrend,
      medications: medications.filter(med => med.name !== 'Medication Tracking').map(med => ({
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay,
        frequency: med.frequency
      })),
      medicationTracking: {
        missedMedications: combinedMissedMedications,
        nsaids: combinedNsaids,
        antibiotics: combinedAntibiotics
      },
      appointments: filteredAppointments,
      weightEntries: filteredWeight,
      hydrationEntries: filteredHydration,
      hydrationTarget: HYDRATION_TARGET,
      bowelMovementEntries: filteredBowelMovements
    })
    setIsLoading(false)
  }

  const hasDataToExport = () => {
    if (!reportData) return false
    const hasTrackingData = reportData.medicationTracking && (
      reportData.medicationTracking.missedMedications.length > 0 || 
      reportData.medicationTracking.nsaids.length > 0 || 
      reportData.medicationTracking.antibiotics.length > 0
    )
    const hasAppointments = reportData.appointments && reportData.appointments.length > 0
    const hasWeight = reportData.weightEntries && reportData.weightEntries.length > 0
    const hasHydration = reportData.hydrationEntries && reportData.hydrationEntries.length > 0
    const hasBowel =
      reportData.bowelMovementEntries && reportData.bowelMovementEntries.length > 0
    return (
      reportData.totalEntries > 0 ||
      reportData.medications.length > 0 ||
      hasTrackingData ||
      hasAppointments ||
      hasWeight ||
      hasHydration ||
      hasBowel
    )
  }

  const handleExportClick = (exportFunction) => {
    if (!hasDataToExport()) {
      setNoDataModalIsEmail(false)
      setShowNoDataModal(true)
      return
    }
    exportFunction()
  }

  const exportToPDF = () => {
    if (!reportData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = 20

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('FlareCare Health Report', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // Period
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Report Period: ${formatUKDate(reportData.period.start)} to ${formatUKDate(reportData.period.end)}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 20

    // Summary Section
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', margin, yPosition)
    yPosition += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Symptom Entries: ${reportData.totalEntries}`, margin, yPosition)
    yPosition += 8
    doc.text(`Average Severity: ${reportData.averageSeverity.toFixed(1)}/10`, margin, yPosition)
    yPosition += 15

    // Medications Section
    if (reportData.medications.length > 0) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Current Medications', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.medications.forEach(med => {
        doc.setFont('helvetica', 'bold')
        doc.text(med.name || '—', margin, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        if (med.dosage?.toString().trim()) {
          doc.text(`   Dosage: ${med.dosage}`, margin, yPosition)
          yPosition += 5
        }
        if (med.frequency?.toString().trim()) {
          doc.text(`   Frequency: ${med.frequency}`, margin, yPosition)
          yPosition += 5
        }
        yPosition += 3
      })
      yPosition += 10
    }

    // Tracked Medications Section
    const hasTrackingData = reportData.medicationTracking && (
      reportData.medicationTracking.missedMedications.length > 0 || 
      reportData.medicationTracking.nsaids.length > 0 || 
      reportData.medicationTracking.antibiotics.length > 0
    )
    
    if (hasTrackingData) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Medication logs', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      
      // Missed Medications
      if (reportData.medicationTracking.missedMedications.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Missed Medications:', margin, yPosition)
        yPosition += 6
        
        doc.setFont('helvetica', 'normal')
        reportData.medicationTracking.missedMedications.forEach(item => {
          const dateText = item.date ? formatUKDate(item.date) : 'Date not specified'
          doc.text(`• ${item.medication} - ${dateText} (${item.timeOfDay})`, margin + 10, yPosition)
          yPosition += 5
        })
        yPosition += 5
      }
      
      // NSAIDs
      if (reportData.medicationTracking.nsaids.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('NSAIDs Taken:', margin, yPosition)
        yPosition += 6
        
        doc.setFont('helvetica', 'normal')
        reportData.medicationTracking.nsaids.forEach(item => {
          const dateText = item.date ? formatUKDate(item.date) : 'Date not specified'
          const dosageText = item.dosage ? ` - Dosage: ${item.dosage}` : ''
          doc.text(`• ${item.medication} - ${dateText} (${item.timeOfDay})${dosageText}`, margin + 10, yPosition)
          yPosition += 5
        })
        yPosition += 5
      }
      
      // Antibiotics
      if (reportData.medicationTracking.antibiotics.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Antibiotics Taken:', margin, yPosition)
        yPosition += 6
        
        doc.setFont('helvetica', 'normal')
        reportData.medicationTracking.antibiotics.forEach(item => {
          const dateText = item.date ? formatUKDate(item.date) : 'Date not specified'
          const dosageText = item.dosage ? ` - Dosage: ${item.dosage}` : ''
          doc.text(`• ${item.medication} - ${dateText} (${item.timeOfDay})${dosageText}`, margin + 10, yPosition)
          yPosition += 5
        })
        yPosition += 5
      }
      
      yPosition += 10
    }

    // Appointments Section
    if (reportData.appointments && reportData.appointments.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Appointments', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.appointments.forEach(apt => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const dateText = apt.date ? formatUKDate(apt.date) : ''
        const timeText = apt.time?.toString().trim() || ''
        const typeText = apt.type?.toString().trim() || ''
        const clinicianText = apt.clinician_name?.toString().trim() || ''
        const locationText = apt.location?.toString().trim() || ''
        const notesText = apt.notes?.toString().trim() || ''
        doc.setFont('helvetica', 'bold')
        const headline = `${dateText || '—'}${timeText ? ` ${timeText}` : ''}${typeText ? ` — ${typeText}` : ''}`
        doc.text(headline, margin, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        if (clinicianText) {
          doc.text(`   Clinician: ${clinicianText}`, margin, yPosition)
          yPosition += 5
        }
        if (locationText) {
          doc.text(`   Location: ${locationText}`, margin, yPosition)
          yPosition += 5
        }
        if (notesText) {
          const splitNotes = doc.splitTextToSize(`   Notes: ${notesText}`, pageWidth - 2 * margin)
          doc.text(splitNotes, margin, yPosition)
          yPosition += splitNotes.length * 5
        }
        yPosition += 5
      })
      yPosition += 10
    }

    // Weight Section
    if (reportData.weightEntries && reportData.weightEntries.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Weight Logs', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.weightEntries.forEach(entry => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const dateText = entry.date ? formatUKDate(entry.date) : ''
        const weightText = entry.value_kg != null ? `${entry.value_kg} kg` : ''
        const notesText = entry.notes?.toString().trim() || ''
        doc.text(`${dateText} - ${weightText}`, margin, yPosition)
        yPosition += 5
        if (notesText) {
          const splitNotes = doc.splitTextToSize(`   Notes: ${notesText}`, pageWidth - 2 * margin)
          doc.text(splitNotes, margin, yPosition)
          yPosition += splitNotes.length * 5
          yPosition += 5
        }
      })
      yPosition += 10
    }

    // Hydration logs section
    if (reportData.hydrationEntries && reportData.hydrationEntries.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Hydration Logs', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.hydrationEntries.forEach(entry => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const dateText = entry.date ? formatUKDate(entry.date) : ''
        const glassesText = `${entry.glasses}/${reportData.hydrationTarget || 6} glasses`
        const targetMet = entry.targetMet ? ' (Target met)' : ''
        doc.text(`${dateText} - ${glassesText}${targetMet}`, margin, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    if (reportData.bowelMovementEntries && reportData.bowelMovementEntries.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Bowel movements', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.bowelMovementEntries.forEach((entry) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const dateText = formatUKDateFromOccurredAt(entry.occurredAt)
        const timeText = formatUKTimeFromOccurredAt(entry.occurredAt)
        const whenParts = []
        if (dateText !== '—') whenParts.push(dateText)
        if (timeText !== '—') whenParts.push(timeText)
        const whenText = whenParts.length ? whenParts.join(' ') : ''
        const bristol = formatBristolLine(entry.bristolType)
        const linePrefix = whenText ? `${whenText} — ` : ''
        doc.setFont('helvetica', 'bold')
        doc.text(`${linePrefix}${bristol}`, margin, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`   Blood: ${formatBowelYesNo(entry.blood)}`, margin, yPosition)
        yPosition += 5
        doc.text(`   Strain: ${formatBowelYesNo(entry.strain)}`, margin, yPosition)
        yPosition += 5
        doc.text(`   Urgency: ${formatBowelYesNo(entry.urgency)}`, margin, yPosition)
        yPosition += 5
        const bowelNotes = entry.notes?.toString().trim() || ''
        if (bowelNotes) {
          const splitBowelNotes = doc.splitTextToSize(`   Notes: ${bowelNotes}`, pageWidth - 2 * margin)
          doc.text(splitBowelNotes, margin, yPosition)
          yPosition += splitBowelNotes.length * 5
          yPosition += 5
        }
      })
      yPosition += 10
    }

      // Detailed Symptoms Section
    if (reportData.severityTrend.length > 0) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
        doc.text('Symptoms', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      
      // Get the actual symptom data with notes
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      
      const detailedSymptoms = symptoms.filter(symptom => {
        const symptomStartDate = new Date(symptom.symptomStartDate)
        const symptomEndDate = symptom.symptomEndDate ? new Date(symptom.symptomEndDate) : new Date()
        return (symptomStartDate <= endDate && symptomEndDate >= startDate)
      }).sort((a, b) => new Date(a.symptomStartDate) - new Date(b.symptomStartDate))

      detailedSymptoms.forEach((symptom, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFont('helvetica', 'bold')
        // Show date range for non-ongoing symptoms, or just start date for ongoing
        const dateText = symptom.isOngoing 
          ? `${index + 1}. ${formatUKDate(symptom.symptomStartDate)}`
          : `${index + 1}. ${formatUKDate(symptom.symptomStartDate)} - ${formatUKDate(symptom.symptomEndDate)}`
        doc.text(dateText, margin, yPosition)
        yPosition += 6
        
        doc.setFont('helvetica', 'normal')
        doc.text(`   Severity: ${symptom.severity}/10 (${getSeverityLabel(symptom.severity)})`, margin, yPosition)
        yPosition += 5
        
        if (symptom.stress_level) {
          doc.text(`   Stress Level: ${symptom.stress_level}/10 (${getStressLabel(symptom.stress_level)})`, margin, yPosition)
          yPosition += 5
        }
        
        if (symptom.isOngoing) {
          doc.text(`   Status: Ongoing`, margin, yPosition)
          yPosition += 5
        } else {
          doc.text(`   Status: Resolved`, margin, yPosition)
          yPosition += 5
        }
        
        // Display smoking: "Non-smoker" if habit is no, "No" if didn't smoke that day
        if (symptom.smoking === true) {
          const smokingText = symptom.smoking_details 
            ? `   Smoking: ${symptom.smoking_details}`
            : `   Smoking: Yes`
          doc.text(smokingText, margin, yPosition)
          yPosition += 5
        } else if (symptom.smoking === false) {
          const smokingLabel = userPreferences?.isSmoker === false ? 'Non-smoker' : 'No'
          doc.text(`   Smoking: ${smokingLabel}`, margin, yPosition)
          yPosition += 5
        }
        
        // Display alcohol: "Non-drinker" if habit is no, "No" if didn't drink that day
        if (symptom.alcohol === true) {
          const alcoholText = symptom.alcohol_units 
            ? `   Alcohol: ${symptom.alcohol_units} ${symptom.alcohol_units === '1' ? 'unit' : 'units'} per day`
            : `   Alcohol: Yes`
          doc.text(alcoholText, margin, yPosition)
          yPosition += 5
        } else if (symptom.alcohol === false) {
          const alcoholLabel = userPreferences?.isDrinker === false ? 'Non-drinker' : 'No'
          doc.text(`   Alcohol: ${alcoholLabel}`, margin, yPosition)
          yPosition += 5
        }
        
        // Display bathroom frequency information
        if (symptom.normal_bathroom_frequency || symptom.bathroom_frequency_changed) {
          if (symptom.normal_bathroom_frequency) {
            doc.text(`   Bathroom Frequency: ${symptom.normal_bathroom_frequency} times per day`, margin, yPosition)
            yPosition += 5
          }
          if (symptom.bathroom_frequency_changed) {
            doc.text(`   Frequency Changed: ${symptom.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}`, margin, yPosition)
            yPosition += 5
          }
          if (symptom.bathroom_frequency_change_details) {
            const changeDetailsText = `   Change Details: ${symptom.bathroom_frequency_change_details}`
            const splitText = doc.splitTextToSize(changeDetailsText, 180) // 180mm width
            doc.text(splitText, margin, yPosition)
            yPosition += splitText.length * 5
          }
        }
        
        // Display foods (handle both old and new formats)
        let foodsText = ''
        if (symptom.breakfast || symptom.lunch || symptom.dinner) {
          // New format: structured meals
          const mealSections = []
          if (symptom.breakfast?.length > 0) {
            const breakfastItems = symptom.breakfast.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Breakfast: ${breakfastItems}`)
          }
          if (symptom.lunch?.length > 0) {
            const lunchItems = symptom.lunch.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Lunch: ${lunchItems}`)
          }
          if (symptom.dinner?.length > 0) {
            const dinnerItems = symptom.dinner.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Dinner: ${dinnerItems}`)
          }
          if (mealSections.length > 0) {
            foodsText = `   Meals: ${mealSections.join(' | ')}`
          }
        } else if (symptom.foods && symptom.foods.trim()) {
          // Old format: comma-separated foods
          foodsText = `   Foods: ${symptom.foods}`
        }
        
        if (foodsText) {
          const splitFoods = doc.splitTextToSize(foodsText, pageWidth - 2 * margin)
          doc.text(splitFoods, margin, yPosition)
          yPosition += splitFoods.length * 5
        }

        // Notes last (matches email + CSV ordering)
        if (symptom.notes && symptom.notes.trim()) {
          const notesText = `   Notes: ${symptom.notes}`
          const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * margin)
          doc.text(splitNotes, margin, yPosition)
          yPosition += splitNotes.length * 5
        }
        
        yPosition += 8
      })
      yPosition += 10
    }

    // Top Foods Section
    if (reportData.topFoods.length > 0) {
      // Check if we have enough space for the title and at least one food item
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Top 5 Most Logged Foods', margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.topFoods.forEach(([food, count]) => {
        // Only check for new page if we're getting close to the bottom
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(`• ${food} (${count} times)`, margin, yPosition)
        yPosition += 6
      })
    }

    // Save the PDF
    doc.save(`flarecare-report-${reportData.period.start}-to-${reportData.period.end}.pdf`)
  }

  const exportToCSV = () => {
    if (!reportData) return

    const csvData = []
    
    // Add header
    csvData.push(['Symptom Start Date', 'Symptom End Date', 'Ongoing', 'Severity', 'Stress Level', 'Normal Bathroom Frequency', 'Bathroom Frequency Changed', 'Bathroom Change Details', 'Smoking', 'Alcohol', 'Foods', 'Notes'])
    
    // Filter symptoms by selected date range (same logic as generateReport)
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    
    const filteredSymptoms = symptoms.filter(symptom => {
      const symptomStartDate = new Date(symptom.symptomStartDate)
      const symptomEndDate = symptom.symptomEndDate ? new Date(symptom.symptomEndDate) : new Date()
      return (symptomStartDate <= endDate && symptomEndDate >= startDate)
    })
    
    // Add symptom data
    filteredSymptoms
      .sort((a, b) => new Date(a.symptomStartDate) - new Date(b.symptomStartDate))
      .forEach(symptom => {
        // Format foods data (handle both old and new formats)
        let foodsData = ''
        if (symptom.breakfast || symptom.lunch || symptom.dinner) {
          // New format: structured meals
          const mealSections = []
          if (symptom.breakfast?.length > 0) {
            const breakfastItems = symptom.breakfast.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Breakfast: ${breakfastItems}`)
          }
          if (symptom.lunch?.length > 0) {
            const lunchItems = symptom.lunch.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Lunch: ${lunchItems}`)
          }
          if (symptom.dinner?.length > 0) {
            const dinnerItems = symptom.dinner.map(item => 
              item.quantity ? `${item.food} (${item.quantity})` : item.food
            ).join(', ')
            mealSections.push(`Dinner: ${dinnerItems}`)
          }
          foodsData = mealSections.join(' | ')
        } else {
          // Old format: comma-separated foods
          foodsData = symptom.foods || ''
        }
        
        // Format smoking: "Non-smoker" if habit is no, "No" if didn't smoke that day, details if yes
        const smokingData = symptom.smoking === true
          ? (symptom.smoking_details || 'Yes')
          : symptom.smoking === false
            ? (userPreferences?.isSmoker === false ? 'Non-smoker' : 'No')
            : ''
        
        // Format alcohol: "Non-drinker" if habit is no, "No" if didn't drink that day, details if yes
        const alcoholData = symptom.alcohol === true
          ? (symptom.alcohol_units ? `${symptom.alcohol_units} ${symptom.alcohol_units === '1' ? 'unit' : 'units'} per day` : 'Yes')
          : symptom.alcohol === false
            ? (userPreferences?.isDrinker === false ? 'Non-drinker' : 'No')
            : ''
        
        // Format bathroom frequency data
        const normalBathroomData = symptom.normal_bathroom_frequency || ''
        const bathroomChangedData = symptom.bathroom_frequency_changed || ''
        const bathroomChangeDetailsData = symptom.bathroom_frequency_change_details || ''

        csvData.push([
          formatUKDate(symptom.symptomStartDate),
          symptom.symptomEndDate ? formatUKDate(symptom.symptomEndDate) : '',
          symptom.isOngoing ? 'Yes' : 'No',
          symptom.severity,
          symptom.stress_level || '',
          normalBathroomData,
          bathroomChangedData,
          bathroomChangeDetailsData,
          smokingData,
          alcoholData,
          foodsData,
          symptom.notes || '',
        ])
      })

    if (reportData.medications.length > 0) {
      csvData.push([])
      csvData.push(['CURRENT MEDICATIONS'])
      csvData.push(['Name', 'Dosage', 'Frequency'])
      reportData.medications.forEach((med) => {
        csvData.push([
          med.name || '',
          med.dosage?.toString() || '',
          med.frequency?.toString() || '',
        ])
      })
      csvData.push([])
    }

    // Add medication tracking data if available
    const hasTrackingData = reportData.medicationTracking && (
      reportData.medicationTracking.missedMedications.length > 0 || 
      reportData.medicationTracking.nsaids.length > 0 || 
      reportData.medicationTracking.antibiotics.length > 0
    )

    if (hasTrackingData) {
      // Add section separator
      csvData.push([])
      csvData.push(['MEDICATION LOGS'])
      csvData.push([])
      
      // Missed Medications
      if (reportData.medicationTracking.missedMedications.length > 0) {
        csvData.push(['Missed Medications'])
        csvData.push(['Medication', 'Date', 'Time of Day'])
        reportData.medicationTracking.missedMedications.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || ''
          ])
        })
        csvData.push([])
      }
      
      // NSAIDs
      if (reportData.medicationTracking.nsaids.length > 0) {
        csvData.push(['NSAIDs Taken'])
        csvData.push(['Medication', 'Date', 'Time of Day', 'Dosage'])
        reportData.medicationTracking.nsaids.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || '',
            item.dosage || ''
          ])
        })
        csvData.push([])
      }
      
      // Antibiotics
      if (reportData.medicationTracking.antibiotics.length > 0) {
        csvData.push(['Antibiotics Taken'])
        csvData.push(['Medication', 'Date', 'Time of Day', 'Dosage'])
        reportData.medicationTracking.antibiotics.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || '',
            item.dosage || ''
          ])
        })
        csvData.push([])
      }
    }

    // Appointments
    if (reportData.appointments && reportData.appointments.length > 0) {
      csvData.push([])
      csvData.push(['UPCOMING APPOINTMENTS'])
      csvData.push(['Date', 'Time', 'Type', 'Clinician', 'Location', 'Notes'])
      reportData.appointments.forEach(apt => {
        csvData.push([
          apt.date ? formatUKDate(apt.date) : '',
          apt.time?.toString().trim() || '',
          apt.type?.toString().trim() || '',
          apt.clinician_name?.toString().trim() || '',
          apt.location?.toString().trim() || '',
          apt.notes?.toString().trim() || '',
        ])
      })
      csvData.push([])
    }

    // Weight
    if (reportData.weightEntries && reportData.weightEntries.length > 0) {
      csvData.push([])
      csvData.push(['WEIGHT'])
      csvData.push(['Date', 'Weight (kg)', 'Notes'])
      reportData.weightEntries.forEach(entry => {
        csvData.push([
          entry.date ? formatUKDate(entry.date) : '',
          entry.value_kg != null ? String(entry.value_kg) : '',
          entry.notes?.toString().trim() || '',
        ])
      })
      csvData.push([])
    }

    // Hydration logs
    if (reportData.hydrationEntries && reportData.hydrationEntries.length > 0) {
      csvData.push([])
      csvData.push(['HYDRATION LOGS'])
      csvData.push(['Date', 'Glasses', 'Target', 'Target Met'])
      const target = reportData.hydrationTarget || 6
      reportData.hydrationEntries.forEach(entry => {
        csvData.push([
          entry.date ? formatUKDate(entry.date) : '',
          String(entry.glasses ?? 0),
          String(target),
          entry.targetMet ? 'Yes' : 'No'
        ])
      })
      csvData.push([])
    }

    if (reportData.bowelMovementEntries && reportData.bowelMovementEntries.length > 0) {
      csvData.push([])
      csvData.push(['BOWEL MOVEMENTS'])
      csvData.push(['Date', 'Time', 'Bristol type', 'Blood', 'Strain', 'Urgency', 'Notes'])
      reportData.bowelMovementEntries.forEach((entry) => {
        const dateStr = formatUKDateFromOccurredAt(entry.occurredAt)
        const timeStr = formatUKTimeFromOccurredAt(entry.occurredAt)
        csvData.push([
          dateStr === '—' ? '' : dateStr,
          timeStr === '—' ? '' : timeStr,
          formatBristolLine(entry.bristolType),
          formatBowelYesNo(entry.blood),
          formatBowelYesNo(entry.strain),
          formatBowelYesNo(entry.urgency),
          entry.notes?.toString().trim() || '',
        ])
      })
      csvData.push([])
    }

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    // Download CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `flarecare-data-${reportData.period.start}-to-${reportData.period.end}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const formatUKDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const emailSentToastEl =
    showEmailSentToast && emailToastPortalReady ? (
      <div
        className="fixed z-[9999] top-24 right-4 max-w-[min(24rem,calc(100vw-2rem))] rounded-xl shadow-lg border border-white/10 dark:border-white/15 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-dropdown)' }}
        role="status"
      >
        <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-white">
          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="flex-1 text-sm font-medium font-sans" style={{ color: 'var(--text-primary)' }}>
          Report sent successfully!
        </span>
        <button
          type="button"
          onClick={() => {
            if (emailSentToastTimerRef.current) {
              clearTimeout(emailSentToastTimerRef.current)
              emailSentToastTimerRef.current = null
            }
            setShowEmailSentToast(false)
          }}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ) : null

  const emailToastPortal =
    emailToastPortalReady && typeof document !== 'undefined' && emailSentToastEl
      ? createPortal(emailSentToastEl, document.body)
      : null

  // Simple loading state - render page structure like other pages
  if (!user || isLoading || !reportData) {
    return (
      <div className="w-full sm:px-4 md:px-6 lg:px-8 min-w-0 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 card">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4">Reports</h1>
            <p className="text-sm sm:text-base text-secondary font-sans">
              Generate reports from your records to support informed decisions about your care.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const medicationLogsTotal =
    (reportData.medicationTracking?.missedMedications?.length ?? 0) +
    (reportData.medicationTracking?.nsaids?.length ?? 0) +
    (reportData.medicationTracking?.antibiotics?.length ?? 0)

  return (
    <div className="w-full sm:px-4 md:px-6 lg:px-8 min-w-0 min-h-screen">
      {emailToastPortal}
      <div className="max-w-4xl mx-auto">
      <div className="mb-5 sm:mb-6 card">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-4">Reports</h1>
        <p className="text-sm sm:text-base text-secondary font-sans leading-relaxed">
          Generate reports from your records to support informed decisions about your care.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-5 sm:mb-6">
        <div className="flex items-center mb-6">
          <div className="flex w-10 h-10 bg-orange-100 dashboard-icon-panel rounded-lg items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
            <Calendar className="w-5 h-5 text-orange-600 dark:[color:var(--text-icon-more-reports)]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold font-title text-primary flex-1 capitalize">Select report period</h2>
        </div>
        <p className="text-sm text-secondary font-sans leading-relaxed mb-6">
          Choose a date range to include symptom episodes in the report.
        </p>
        
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-3 sm:gap-2 mb-6">
          <button 
            onClick={() => {
              const endDate = new Date()
              const startDate = new Date()
              startDate.setDate(endDate.getDate() - 7)
              setDateRange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              })
            }}
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover transition-colors font-sans"
          >
            Last 7 days
          </button>
          <button 
            onClick={() => {
              const endDate = new Date()
              const startDate = new Date()
              startDate.setDate(endDate.getDate() - 30)
              setDateRange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              })
            }}
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover transition-colors font-sans"
          >
            Last 30 days
          </button>
          <button 
            onClick={() => {
              const endDate = new Date()
              const startDate = new Date()
              startDate.setMonth(endDate.getMonth() - 3)
              setDateRange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              })
            }}
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover transition-colors font-sans"
          >
            Last 3 months
          </button>
          <button 
            onClick={() => {
              const endDate = new Date()
              const startDate = new Date(0) // epoch = true "all time"
              setDateRange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              })
            }}
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover transition-colors font-sans"
          >
            All time
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
          <div className="w-full sm:w-auto">
            <label htmlFor="startDate" className="block text-sm font-medium font-sans text-primary mb-2">
              Start Date
            </label>
            <div className="w-full sm:max-w-[150px]">
              <DatePicker
                ref={reportStartDatePickerRef}
                id="startDate"
                selected={dateRange.startDate ? new Date(dateRange.startDate) : null}
                onChange={(date) => setDateRange(prev => ({ 
                  ...prev, 
                  startDate: date ? date.toISOString().split('T')[0] : '' 
                }))}
                placeholderText="Select start date"
                customInput={<DateInputWithCalendar onIconClick={() => reportStartDatePickerRef.current?.setOpen?.(true)} />}
                dateFormat="dd/MM/yyyy"
                maxDate={dateRange.endDate ? new Date(dateRange.endDate) : new Date()}
                preventOpenOnFocus
                wrapperClassName="w-full"
                enableTabLoop={false}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="endDate" className="block text-sm font-medium font-sans text-primary mb-2">
              End Date
            </label>
            <div className="w-full sm:max-w-[150px]">
              <DatePicker
                ref={reportEndDatePickerRef}
                id="endDate"
                selected={dateRange.endDate ? new Date(dateRange.endDate) : null}
                onChange={(date) => setDateRange(prev => ({ 
                  ...prev, 
                  endDate: date ? date.toISOString().split('T')[0] : '' 
                }))}
                placeholderText="Select end date"
                customInput={<DateInputWithCalendar onIconClick={() => reportEndDatePickerRef.current?.setOpen?.(true)} />}
                dateFormat="dd/MM/yyyy"
                minDate={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                maxDate={new Date()}
                preventOpenOnFocus
                wrapperClassName="w-full"
                enableTabLoop={false}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary font-sans leading-relaxed">
            Found {reportData.totalEntries} {reportData.totalEntries === 1 ? 'episode' : 'episodes'} in the selected period
          </p>
          {reportData.totalEntries > 0 && (
            <div className="card-inner p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Episodes</span>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold text-primary font-sans">{reportData.totalEntries}</p>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Average severity</span>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold text-primary font-sans">{reportData.averageSeverity}</p>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary tracking-wide block font-sans">Average stress</span>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold text-primary font-sans">
                    {reportData.averageStress != null && !isNaN(reportData.averageStress) ? reportData.averageStress : 0}
                  </p>
                </div>
              </div>
            </div>
          )}
          {reportData.totalEntries > 0 && (
            <div className="text-sm text-secondary font-sans leading-relaxed">
              Showing symptoms from {formatUKDate(dateRange.startDate)} to {formatUKDate(dateRange.endDate)}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleExportClick(exportToPDF)} className="inline-flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 button-cadet rounded-lg whitespace-nowrap text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
              Export PDF
            </button>
            <button onClick={() => handleExportClick(exportToCSV)} className="inline-flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 button-cadet rounded-lg whitespace-nowrap text-sm sm:text-base">
              <FileDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={openEmailModal}
              className="inline-flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 button-cadet rounded-lg whitespace-nowrap text-sm sm:text-base"
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
              Email Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      <div className="space-y-4 sm:space-y-6 mb-5 sm:mb-6">
        {/* Current Medications */}
        {reportData.medications.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('currentMeds')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.currentMeds ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">Current Medications ({reportData.medications.length})</h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.currentMeds ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.currentMeds ? 'auto' : 0,
                opacity: expandedSections.currentMeds ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.medications.map((med, index) => {
                const hasDosage = !!med.dosage
                const hasFrequency = !!med.frequency
                return (
                <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                  <div
                    className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasDosage || hasFrequency ? 'border-b' : ''}`}
                    style={hasDosage || hasFrequency ? { borderColor: 'var(--separator-card)' } : undefined}
                  >
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Medication</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={med.name}>{med.name}</span>
                  </div>
                  {hasDosage && (
                    <div
                      className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasFrequency ? 'border-b' : ''}`}
                      style={hasFrequency ? { borderColor: 'var(--separator-card)' } : undefined}
                    >
                      <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Dosage</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 text-right">{med.dosage}</span>
                    </div>
                  )}
                  {hasFrequency && (
                    <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                      <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Frequency</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans min-w-0 text-right">{med.frequency}</span>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
            </motion.div>
          </div>
        )}

        {/* Medication logs */}
        {reportData.medicationTracking && (
          reportData.medicationTracking.missedMedications.length > 0 ||
          reportData.medicationTracking.nsaids.length > 0 ||
          reportData.medicationTracking.antibiotics.length > 0
        ) && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('medicationLogs')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.medicationLogs ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">
                {expandedSections.medicationLogs ? (
                  <span className="inline-block pb-0.5 border-b" style={{ borderColor: 'var(--separator-card)' }}>
                    Medication logs ({medicationLogsTotal})
                  </span>
                ) : (
                  `Medication logs (${medicationLogsTotal})`
                )}
              </h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.medicationLogs ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.medicationLogs ? 'auto' : 0,
                opacity: expandedSections.medicationLogs ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            {reportData.medicationTracking.missedMedications.length > 0 && (
              <div
                className={
                  reportData.medicationTracking.nsaids.length > 0 ||
                  reportData.medicationTracking.antibiotics.length > 0
                    ? 'mb-6'
                    : ''
                }
              >
                <h3 className="text-base font-semibold text-primary mb-3 font-sans">Missed Medications ({reportData.medicationTracking.missedMedications.length})</h3>
                <div className="space-y-0 [&>*:last-child>*:last-child]:pb-0">
                  {reportData.medicationTracking.missedMedications
                    .slice(listPages.missedMeds * REPORT_PAGE_SIZE, (listPages.missedMeds + 1) * REPORT_PAGE_SIZE)
                    .map((item, idx) => {
                      const index = listPages.missedMeds * REPORT_PAGE_SIZE + idx
                      const hasDate = !!item.date
                      const hasTime = !!item.timeOfDay
                      return (
                        <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                          <div
                            className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasDate || hasTime ? 'border-b' : ''}`}
                            style={hasDate || hasTime ? { borderColor: 'var(--separator-card)' } : undefined}
                          >
                            <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Medication</span>
                            <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={item.medication}>{item.medication}</span>
                          </div>
                          {hasDate && (
                            <div
                              className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasTime ? 'border-b' : ''}`}
                              style={hasTime ? { borderColor: 'var(--separator-card)' } : undefined}
                            >
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Date</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans">{formatUKDate(item.date)}</span>
                            </div>
                          )}
                          {hasTime && (
                            <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Time</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans">{item.timeOfDay}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
                {reportData.medicationTracking.missedMedications.length > REPORT_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2 pt-4 border-t" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm text-secondary font-sans">
                      {listPages.missedMeds * REPORT_PAGE_SIZE + 1}–{Math.min((listPages.missedMeds + 1) * REPORT_PAGE_SIZE, reportData.medicationTracking.missedMedications.length)} of {reportData.medicationTracking.missedMedications.length}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setListPage('missedMeds', listPages.missedMeds - 1)} disabled={listPages.missedMeds === 0} className="px-3 py-1.5 text-sm button-cancel rounded-lg disabled:opacity-50">Previous</button>
                      <button type="button" onClick={() => setListPage('missedMeds', listPages.missedMeds + 1)} disabled={(listPages.missedMeds + 1) * REPORT_PAGE_SIZE >= reportData.medicationTracking.missedMedications.length} className="px-3 py-1.5 text-sm button-cadet rounded-lg disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reportData.medicationTracking.nsaids.length > 0 && (
              <div className={reportData.medicationTracking.antibiotics.length > 0 ? 'mb-6' : ''}>
                <h3 className="text-base font-semibold text-primary mb-3 font-sans">NSAIDs Taken ({reportData.medicationTracking.nsaids.length})</h3>
                <div className="space-y-0 [&>*:last-child>*:last-child]:pb-0">
                  {reportData.medicationTracking.nsaids
                    .slice(listPages.nsaids * REPORT_PAGE_SIZE, (listPages.nsaids + 1) * REPORT_PAGE_SIZE)
                    .map((item, idx) => {
                      const index = listPages.nsaids * REPORT_PAGE_SIZE + idx
                      const hasDate = !!item.date
                      const hasDosage = !!item.dosage
                      const hasTime = !!item.timeOfDay
                      return (
                        <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                          <div
                            className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasDate || hasDosage || hasTime ? 'border-b' : ''}`}
                            style={hasDate || hasDosage || hasTime ? { borderColor: 'var(--separator-card)' } : undefined}
                          >
                            <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Medication</span>
                            <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={item.medication}>{item.medication}</span>
                          </div>
                          {hasDate && (
                            <div
                              className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasDosage || hasTime ? 'border-b' : ''}`}
                              style={hasDosage || hasTime ? { borderColor: 'var(--separator-card)' } : undefined}
                            >
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Date</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans">{formatUKDate(item.date)}</span>
                            </div>
                          )}
                          {hasDosage && (
                            <div
                              className={`flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden ${hasTime ? 'border-b' : ''}`}
                              style={hasTime ? { borderColor: 'var(--separator-card)' } : undefined}
                            >
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Dosage</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={item.dosage}>{item.dosage}</span>
                            </div>
                          )}
                          {hasTime && (
                            <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Time</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans">{item.timeOfDay}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
                {reportData.medicationTracking.nsaids.length > REPORT_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2 pt-4 border-t" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm text-secondary font-sans">
                      {listPages.nsaids * REPORT_PAGE_SIZE + 1}–{Math.min((listPages.nsaids + 1) * REPORT_PAGE_SIZE, reportData.medicationTracking.nsaids.length)} of {reportData.medicationTracking.nsaids.length}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setListPage('nsaids', listPages.nsaids - 1)} disabled={listPages.nsaids === 0} className="px-3 py-1.5 text-sm button-cancel rounded-lg disabled:opacity-50">Previous</button>
                      <button type="button" onClick={() => setListPage('nsaids', listPages.nsaids + 1)} disabled={(listPages.nsaids + 1) * REPORT_PAGE_SIZE >= reportData.medicationTracking.nsaids.length} className="px-3 py-1.5 text-sm button-cadet rounded-lg disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reportData.medicationTracking.antibiotics.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-primary mb-3 font-sans">Antibiotics Taken ({reportData.medicationTracking.antibiotics.length})</h3>
                <div className="space-y-0 [&>*:last-child>*:last-child]:pb-0">
                  {reportData.medicationTracking.antibiotics
                    .slice(listPages.antibiotics * REPORT_PAGE_SIZE, (listPages.antibiotics + 1) * REPORT_PAGE_SIZE)
                    .map((item, idx) => {
                      const index = listPages.antibiotics * REPORT_PAGE_SIZE + idx
                      return (
                        <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                          <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                            <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Medication</span>
                            <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={item.medication}>{item.medication}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                            <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Date</span>
                            <span className="text-sm sm:text-base font-medium text-primary font-sans">{item.date ? formatUKDate(item.date) : 'Not specified'}</span>
                          </div>
                          {item.dosage && (
                            <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                              <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Dosage</span>
                              <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={item.dosage}>{item.dosage}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                            <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Time</span>
                            <span className="text-sm sm:text-base font-medium text-primary font-sans">{item.timeOfDay || 'Not specified'}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
                {reportData.medicationTracking.antibiotics.length > REPORT_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2 pt-4 border-t" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm text-secondary font-sans">
                      {listPages.antibiotics * REPORT_PAGE_SIZE + 1}–{Math.min((listPages.antibiotics + 1) * REPORT_PAGE_SIZE, reportData.medicationTracking.antibiotics.length)} of {reportData.medicationTracking.antibiotics.length}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setListPage('antibiotics', listPages.antibiotics - 1)} disabled={listPages.antibiotics === 0} className="px-3 py-1.5 text-sm button-cancel rounded-lg disabled:opacity-50">Previous</button>
                      <button type="button" onClick={() => setListPage('antibiotics', listPages.antibiotics + 1)} disabled={(listPages.antibiotics + 1) * REPORT_PAGE_SIZE >= reportData.medicationTracking.antibiotics.length} className="px-3 py-1.5 text-sm button-cadet rounded-lg disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </motion.div>
          </div>
        )}

        {/* Appointments */}
        {reportData.appointments && reportData.appointments.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('appointments')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.appointments ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">Appointments ({reportData.appointments.length})</h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.appointments ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.appointments ? 'auto' : 0,
                opacity: expandedSections.appointments ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.appointments.map((apt, index) => (
                <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                  <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Date</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">{apt.date ? formatUKDate(apt.date) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                    <span className="text-sm sm:text-base text-secondary font-sans shrink-0">Type</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0 text-right" title={apt.type}>{apt.type?.toString().trim() || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            </motion.div>
          </div>
        )}

        {/* Weight */}
        {reportData.weightEntries && reportData.weightEntries.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('weightLogs')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.weightLogs ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">Weight Logs ({reportData.weightEntries.length})</h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.weightLogs ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.weightLogs ? 'auto' : 0,
                opacity: expandedSections.weightLogs ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.weightEntries.map((entry, index) => (
                <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                  <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">{formatUKDate(entry.date)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                    <span className="text-sm sm:text-base text-secondary font-sans">Weight</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">{entry.value_kg != null ? `${entry.value_kg} kg` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            </motion.div>
          </div>
        )}

        {/* Bowel movements */}
        {reportData.bowelMovementEntries && reportData.bowelMovementEntries.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('bowelMovements')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.bowelMovements ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="min-w-0 pr-2 text-lg sm:text-xl font-semibold font-title text-primary">
                Bowel movements ({reportData.bowelMovementEntries.length})
              </h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.bowelMovements ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.bowelMovements ? 'auto' : 0,
                opacity: expandedSections.bowelMovements ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.bowelMovementEntries.map((entry, index) => {
                const dateStr = formatUKDateFromOccurredAt(entry.occurredAt)
                const timeStr = formatUKTimeFromOccurredAt(entry.occurredAt)
                return (
                  <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                    <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                      <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans text-right">{dateStr}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                      <span className="text-sm sm:text-base text-secondary font-sans">Time</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans text-right tabular-nums">{timeStr}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                      <span className="text-sm sm:text-base text-secondary font-sans">Type</span>
                      <span className="text-sm sm:text-base font-medium text-primary font-sans text-right tabular-nums">
                        {entry.bristolType != null &&
                        entry.bristolType !== '' &&
                        !Number.isNaN(Number(entry.bristolType))
                          ? Number(entry.bristolType)
                          : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            </motion.div>
          </div>
        )}

        {/* Hydration logs */}
        {reportData.hydrationEntries && reportData.hydrationEntries.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('hydration')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.hydration ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">Hydration Logs ({reportData.hydrationEntries.length})</h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.hydration ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.hydration ? 'auto' : 0,
                opacity: expandedSections.hydration ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.hydrationEntries.map((entry, index) => (
                <div key={index} className={index > 0 ? 'pt-4 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                  <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans">Date</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">{formatUKDate(entry.date)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 py-3 border-b min-w-0 overflow-hidden" style={{ borderColor: 'var(--separator-card)' }}>
                    <span className="text-sm sm:text-base text-secondary font-sans">Glasses</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans">{entry.glasses}/{reportData.hydrationTarget || 6}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                    <span className="text-sm sm:text-base text-secondary font-sans">Target met</span>
                    <span className="text-sm sm:text-base font-medium font-sans text-primary">{entry.targetMet ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              ))}
            </div>
            </motion.div>
          </div>
        )}

        {/* Top Foods */}
        {reportData.topFoods.length > 0 && (
          <div className="card min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('topFoods')}
              className={`flex items-center justify-between w-full text-left group ${expandedSections.topFoods ? 'mb-3 sm:mb-4' : ''}`}
            >
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary">Top 5 Foods</h2>
              <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${expandedSections.topFoods ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
              initial={false}
              animate={{
                height: expandedSections.topFoods ? 'auto' : 0,
                opacity: expandedSections.topFoods ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
            <div className="space-y-0 [&>*:last-child]:pb-0">
              {reportData.topFoods.map(([food, count], index) => (
                <div key={index} className={index > 0 ? 'pt-3 border-t' : ''} style={index > 0 ? { borderColor: 'var(--separator-card)' } : undefined}>
                  <div className="flex justify-between items-center gap-4 py-3 min-w-0 overflow-hidden">
                    <span className="text-sm sm:text-base font-medium text-primary font-sans truncate min-w-0" title={food}>{food}</span>
                    <span className="text-sm sm:text-base font-medium text-primary font-sans shrink-0">{count} time{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {reportData.totalEntries === 0 && reportData.medications.length === 0 && (!reportData.appointments || reportData.appointments.length === 0) && (!reportData.weightEntries || reportData.weightEntries.length === 0) && (!reportData.hydrationEntries || reportData.hydrationEntries.length === 0) && (!reportData.bowelMovementEntries || reportData.bowelMovementEntries.length === 0) && !(reportData.medicationTracking && (reportData.medicationTracking.missedMedications.length > 0 || reportData.medicationTracking.nsaids.length > 0 || reportData.medicationTracking.antibiotics.length > 0)) && (
        <div className="card p-8 text-center">
          <div className="flex justify-center mb-3">
            <FileText className="w-10 h-10 text-secondary opacity-40" />
          </div>
          <h3 className="text-lg font-semibold font-title text-primary mb-2">No Data Available</h3>
          <p className="text-sm font-sans text-secondary max-w-md mx-auto leading-relaxed mb-4">
            Start logging symptoms and adding medications to generate meaningful reports
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
            <a href="/symptoms" className="inline-flex items-center justify-center px-6 py-3 button-cadet rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap">Log Symptoms</a>
            <a href="/medications" className="btn-secondary whitespace-nowrap hover:shadow-none">Add Medications</a>
          </div>
        </div>
      )}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full" style={{ backgroundColor: 'var(--bg-dropdown)', borderColor: 'var(--border-dropdown)', borderWidth: '1px', borderStyle: 'solid' }}>
            <form onSubmit={handleSendReportEmail} className="p-6 space-y-4">
              <h3 className="text-xl sm:text-2xl font-semibold font-title text-primary mb-1">Email this report</h3>
              <p className="text-sm text-secondary font-sans">
                Please fill in the fields below to send this report summary to your clinician.
              </p>
              <div className="space-y-3 mt-2">
                <div>
                  <label htmlFor="consultantEmail" className="block text-sm font-semibold font-sans text-primary mb-2">
                    Consultant email *
                  </label>
                  <input
                    id="consultantEmail"
                    name="consultantEmail"
                    type="email"
                    className="input-field-wizard w-full"
                    value={emailForm.consultantEmail}
                    onChange={handleEmailFormChange}
                    placeholder="dr.smith@example.com"
                    required
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-[var(--text-error)] font-sans">
                      {emailError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="consultantName" className="block text-sm font-semibold font-sans text-primary mb-2">
                    Consultant name (optional)
                  </label>
                  <input
                    id="consultantName"
                    name="consultantName"
                    type="text"
                    className="input-field-wizard w-full"
                    value={emailForm.consultantName}
                    onChange={handleEmailFormChange}
                    placeholder="e.g. Dr Smith, IBD Nurse"
                  />
                </div>
                <div>
                  <label htmlFor="note" className="block text-sm font-semibold font-sans text-primary mb-2">
                    Note to include (optional)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    className="input-field-wizard w-full resize-none"
                    value={emailForm.note}
                    onChange={handleEmailFormChange}
                    placeholder="Any context you want to share with your clinician."
                  />
                </div>
                {reportData?.period && (
                  <div className="text-xs leading-normal text-secondary font-sans bg-[var(--bg-card)]/60 rounded-lg pb-2">
                    This report will cover the period from{' '}
                    {formatUKDate(reportData.period.start)} to {formatUKDate(reportData.period.end)}.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="px-4 py-2 text-base font-medium button-cancel"
                  disabled={isSendingEmail}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-base font-semibold button-cadet rounded-lg inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? 'Sending…' : 'Send report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* No Data Modal */}
      <ConfirmationModal
        isOpen={showNoDataModal}
        onClose={() => setShowNoDataModal(false)}
        onConfirm={() => setShowNoDataModal(false)}
        title={noDataModalIsEmail ? 'No Data to Email' : 'No Data to Export'}
        message={
          noDataModalIsEmail
            ? "There's no data available for the selected period. Please log some symptoms or add medications before emailing a report."
            : "There's no data available for the selected period. Please log some symptoms or add medications before exporting a report."
        }
        confirmText="OK"
        cancelText={null}
        isDestructive={false}
      />
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsPageContent />
    </ProtectedRoute>
  )
}
