'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import jsPDF from 'jspdf'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Calendar, FileText, Download, FileDown, BarChart3, Pill, Activity, TrendingUp, AlertCircle, Thermometer, Brain, Pizza } from 'lucide-react'

// Force dynamic rendering to prevent Vercel static generation issues
export const dynamic = 'force-dynamic'

function ReportsPageContent() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [symptoms, setSymptoms] = useState([])
  const [medications, setMedications] = useState([])
  const [medicationTracking, setMedicationTracking] = useState([])
  const [reportData, setReportData] = useState(null)
  const [isMounted, setIsMounted] = useState(true) // Start as true to show loading screen immediately
  const [isReady, setIsReady] = useState(false)
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

  // Fetch symptoms directly from Supabase
  useEffect(() => {
    const fetchSymptoms = async () => {
      if (!user?.id) {
        setSymptoms([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.SYMPTOMS)
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
          .from(TABLES.TRACK_MEDICATIONS)
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

  useEffect(() => {
    // Only run this when we're on the reports page
    if (pathname !== '/reports') {
      return
    }
    
    // Clear reportData on mount/navigation to prevent stale data flash
    setReportData(null)
    // Ensure isReady starts as false
    setIsReady(false)
    
    // Add style tag to hide all main content to prevent any flash
    const styleId = 'reports-page-hide-content'
    let styleElement = document.getElementById(styleId)
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = `
        main {
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `
      document.head.appendChild(styleElement)
    }
    
    return () => {
      // Remove style tag on unmount
      const styleElement = document.getElementById(styleId)
      if (styleElement) {
        styleElement.remove()
      }
      // Restore visibility
      const mainContent = document.querySelector('main')
      if (mainContent) {
        mainContent.style.visibility = ''
        mainContent.style.opacity = ''
      }
    }
  }, [pathname]) // Re-run when pathname changes to ensure reset on navigation

  useEffect(() => {
    // Reset ready state when pathname changes to ensure loading screen shows
    if (pathname === '/reports') {
      setIsReady(false)
    }
  }, [pathname])

  useEffect(() => {
    if (isMounted && user && pathname === '/reports') {
      generateReport()
    }
  }, [symptoms, medications, medicationTracking, dateRange, isMounted, user, pathname])

  // Only set ready when we have reportData and component is mounted
  useEffect(() => {
    const styleId = 'reports-page-hide-content'
    const styleElement = document.getElementById(styleId)
    
    if (isMounted && reportData !== null) {
      // Use single requestAnimationFrame for faster render
      requestAnimationFrame(() => {
        setIsReady(true)
        // Remove the hide style and restore main content visibility
        if (styleElement) {
          styleElement.remove()
        }
        const mainContent = document.querySelector('main')
        if (mainContent) {
          mainContent.style.visibility = 'visible'
          mainContent.style.opacity = '1'
        }
      })
    } else {
      setIsReady(false)
      // Ensure style is applied if not ready
      if (!styleElement) {
        const newStyleElement = document.createElement('style')
        newStyleElement.id = styleId
        newStyleElement.textContent = `
          main {
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `
        document.head.appendChild(newStyleElement)
      }
    }
  }, [isMounted, reportData])

  const generateReport = () => {
    // Filter symptoms by selected date range
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0) // Use epoch if no start date
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date() // Use today if no end date
    
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

    // Get medication tracking data - filter by date range and combine all entries
    const filteredTrackingEntries = medicationTracking.filter(entry => {
      const entryDate = new Date(entry.created_at)
      return entryDate >= startDate && entryDate <= endDate
    })

    // Combine all medication tracking data from filtered entries
    const combinedMissedMedications = []
    const combinedNsaids = []
    const combinedAntibiotics = []

    filteredTrackingEntries.forEach(entry => {
      if (entry.missed_medications_list && Array.isArray(entry.missed_medications_list)) {
        combinedMissedMedications.push(...entry.missed_medications_list.filter(item => item.medication && item.medication.trim()))
      }
      if (entry.nsaid_list && Array.isArray(entry.nsaid_list)) {
        combinedNsaids.push(...entry.nsaid_list.filter(item => item.medication && item.medication.trim()))
      }
      if (entry.antibiotic_list && Array.isArray(entry.antibiotic_list)) {
        combinedAntibiotics.push(...entry.antibiotic_list.filter(item => item.medication && item.medication.trim()))
      }
    })
    
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
        timeOfDay: med.timeOfDay
      })),
      medicationTracking: {
        missedMedications: combinedMissedMedications,
        nsaids: combinedNsaids,
        antibiotics: combinedAntibiotics
      }
    })
  }

  const hasDataToExport = () => {
    if (!reportData) return false
    const hasTrackingData = reportData.medicationTracking && (
      reportData.medicationTracking.missedMedications.length > 0 || 
      reportData.medicationTracking.nsaids.length > 0 || 
      reportData.medicationTracking.antibiotics.length > 0
    )
    return reportData.totalEntries > 0 || reportData.medications.length > 0 || hasTrackingData
  }

  const handleExportClick = (exportFunction) => {
    if (!hasDataToExport()) {
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
        doc.text(`• ${med.name}${med.dosage ? ` (${med.dosage})` : ''}`, margin, yPosition)
        yPosition += 6
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
      doc.text('Tracked Medications', margin, yPosition)
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

    // Detailed Symptoms Section
    if (reportData.severityTrend.length > 0) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Symptom Details', margin, yPosition)
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
        
        if (symptom.notes && symptom.notes.trim()) {
          const notesText = `   Notes: ${symptom.notes}`
          const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * margin)
          doc.text(splitNotes, margin, yPosition)
          yPosition += splitNotes.length * 5
        }
        
        // Display smoking status
        if (symptom.smoking) {
          const smokingText = symptom.smoking_details 
            ? `   Smoking: ${symptom.smoking_details}`
            : `   Smoking: Yes`
          doc.text(smokingText, margin, yPosition)
          yPosition += 5
        }
        
        // Display alcohol consumption
        if (symptom.alcohol) {
          const alcoholText = symptom.alcohol_units 
            ? `   Alcohol: ${symptom.alcohol_units} ${symptom.alcohol_units === '1' ? 'unit' : 'units'} per day`
            : `   Alcohol: Yes`
          doc.text(alcoholText, margin, yPosition)
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
    csvData.push(['Symptom Start Date', 'Symptom End Date', 'Ongoing', 'Severity', 'Stress Level', 'Normal Bathroom Frequency', 'Bathroom Frequency Changed', 'Bathroom Change Details', 'Notes', 'Smoking', 'Alcohol', 'Foods'])
    
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
        
        // Format smoking data
        const smokingData = symptom.smoking 
          ? (symptom.smoking_details || 'Yes')
          : ''
        
        // Format alcohol data
        const alcoholData = symptom.alcohol 
          ? (symptom.alcohol_units ? `${symptom.alcohol_units} ${symptom.alcohol_units === '1' ? 'unit' : 'units'} per day` : 'Yes')
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
          symptom.notes || '',
          smokingData,
          alcoholData,
          foodsData
        ])
      })

    // Add medication tracking data if available
    const hasTrackingData = reportData.medicationTracking && (
      reportData.medicationTracking.missedMedications.length > 0 || 
      reportData.medicationTracking.nsaids.length > 0 || 
      reportData.medicationTracking.antibiotics.length > 0
    )

    if (hasTrackingData) {
      // Add section separator
      csvData.push([])
      csvData.push(['TRACKED MEDICATIONS'])
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

  // Ensure we're on the correct route
  const isCorrectRoute = pathname === '/reports'
  
  // Prevent hydration mismatch by not rendering until mounted and ready
  // Show loading screen with maximum z-index to prevent flash of other content
  if (!isMounted || !reportData || !isReady || !isCorrectRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{backgroundColor: 'var(--bg-main)', zIndex: 99999}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5F9EA0] mx-auto mb-4"></div>
          <p className="text-primary font-roboto">Generating report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 min-w-0" style={{opacity: isReady ? 1 : 0}}>
      <div className="max-w-4xl mx-auto">
      <div className="mb-8 card">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">Health Reports</h1>
        <p className="lg:text-lg text-secondary font-roboto">
          Generate detailed reports to share with your healthcare team
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card p-8 rounded-2xl mb-8">
        <div className="flex items-center mb-6">
          <div className="hidden sm:flex bg-orange-100 w-8 h-8 lg:w-10 lg:h-10 rounded-lg mr-4 flex-shrink-0 items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold font-source text-primary flex-1">Select Report Period</h2>
        </div>
        
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover rounded-lg transition-colors font-roboto"
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover rounded-lg transition-colors font-roboto"
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover rounded-lg transition-colors font-roboto"
          >
            Last 3 months
          </button>
          <button 
            onClick={() => {
              const allDates = symptoms.map(s => new Date(s.symptomStartDate)).sort((a, b) => a - b)
              if (allDates.length > 0) {
                setDateRange({
                  startDate: allDates[0].toISOString().split('T')[0],
                  endDate: allDates[allDates.length - 1].toISOString().split('T')[0]
                })
              }
            }}
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm card-inner hover:bg-card-hover rounded-lg transition-colors font-roboto"
          >
            All time
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium font-roboto text-primary mb-2">
              Start Date
            </label>
            <DatePicker
              id="startDate"
              selected={dateRange.startDate ? new Date(dateRange.startDate) : null}
              onChange={(date) => setDateRange(prev => ({ 
                ...prev, 
                startDate: date ? date.toISOString().split('T')[0] : '' 
              }))}
              placeholderText="Select start date"
              dateFormat="dd/MM/yyyy"
              maxDate={dateRange.endDate ? new Date(dateRange.endDate) : new Date()}
              className="input-field-wizard w-full"
              calendarClassName="react-datepicker-responsive"
              enableTabLoop={false}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium font-roboto text-primary mb-2">
              End Date
            </label>
            <DatePicker
              id="endDate"
              selected={dateRange.endDate ? new Date(dateRange.endDate) : null}
              onChange={(date) => setDateRange(prev => ({ 
                ...prev, 
                endDate: date ? date.toISOString().split('T')[0] : '' 
              }))}
              placeholderText="Select end date"
              dateFormat="dd/MM/yyyy"
              minDate={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
              maxDate={new Date()}
              className="input-field-wizard w-full"
              calendarClassName="react-datepicker-responsive"
              enableTabLoop={false}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="text-sm text-secondary sm:max-w-md sm:pr-4 font-roboto flex-1">
            Showing symptoms from {formatUKDate(dateRange.startDate)} to {formatUKDate(dateRange.endDate)}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-stretch">
            <button onClick={() => handleExportClick(exportToPDF)} className="inline-flex items-center justify-center px-6 py-3 button-cadet rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap w-full sm:w-auto font-roboto">
              <FileText className="w-5 h-5 mr-2" />
              Export PDF
            </button>
            <button onClick={() => handleExportClick(exportToCSV)} className="inline-flex items-center justify-center px-6 py-3 btn-secondary whitespace-nowrap w-full sm:w-auto font-roboto">
              <FileDown className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      <div className="card p-8 rounded-2xl mb-8">
        <div className="flex items-center mb-6">
          <div className="hidden sm:flex bg-emerald-100 w-8 h-8 lg:w-10 lg:h-10 rounded-lg mr-4 flex-shrink-0 items-center justify-center">
            <Thermometer className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold font-source text-primary flex-1">Symptom Report</h2>
        </div>
        
        {reportData.totalEntries > 0 && (
          <div className="text-sm text-secondary mb-6 font-roboto">
            Found {reportData.totalEntries} symptom {reportData.totalEntries === 1 ? 'episode' : 'episodes'} in the selected period
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card-inner rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              {reportData.totalEntries}
            </div>
            <div className="text-secondary font-medium font-roboto">Symptom Episodes</div>
          </div>
          <div className="card-inner rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold mb-2 text-rose-500">
              {reportData.averageSeverity}
            </div>
            <div className="text-secondary font-medium font-roboto">Average Severity</div>
          </div>
          <div className="card-inner rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold mb-2 text-cyan-600">
              {reportData.averageStress != null && !isNaN(reportData.averageStress) ? reportData.averageStress : 0}
            </div>
            <div className="text-secondary font-medium font-roboto">Average Stress</div>
          </div>
        </div>

        {/* Severity Trend */}
        {reportData.severityTrend.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold font-source text-primary mb-4">Symptom Episodes</h3>
            <div className="space-y-4">
              {reportData.severityTrend.map((entry, index) => (
                <div key={index} className="card-inner p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-full sm:w-40 text-sm text-secondary font-roboto">
                      {formatUKDate(entry.date)}
                      {entry.isOngoing ? ' (Ongoing)' : ` - ${formatUKDate(entry.endDate)}`}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm sm:text-xs font-medium text-secondary font-roboto w-16">Severity:</span>
                        <div className="flex-1 bg-card rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-rose-500" 
                            style={{ 
                              width: `${(entry.severity / 10) * 100}%`
                            }}
                          ></div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-sm sm:text-xs font-medium font-roboto text-rose-500 bg-rose-100">
                          {entry.severity}/10
                        </span>
                      </div>
                      {entry.stressLevel && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm sm:text-xs font-medium text-secondary font-roboto w-16">Stress:</span>
                          <div className="flex-1 bg-card rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-cyan-600" 
                              style={{ 
                                width: `${(entry.stressLevel / 10) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="px-2 py-1 rounded-full text-sm sm:text-xs font-medium font-roboto text-cyan-600 bg-cyan-100">
                            {entry.stressLevel}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medications */}
      {reportData.medications.length > 0 && (
        <div className="card p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold font-source text-primary mb-6 flex items-center">
            <div className="bg-purple-100 w-8 h-8 lg:w-10 lg:h-10 rounded-lg mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center">
              <Pill className="w-5 h-5 text-purple-600" />
            </div>
            Current Medications
          </h2>
          <div className="space-y-4">
            {reportData.medications.map((med, index) => (
              <div key={index} className="card-inner rounded-lg p-4">
                <div>
                  <h5 className="font-medium font-roboto text-primary text-base">{med.name}</h5>
                  {med.dosage && (
                    <div className="mt-2">
                      <span className="text-xs text-secondary font-roboto">
                        <span className="font-medium">Dosage:</span> {med.dosage}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracked Medications */}
      {reportData.medicationTracking && (
        reportData.medicationTracking.missedMedications.length > 0 || 
        reportData.medicationTracking.nsaids.length > 0 || 
        reportData.medicationTracking.antibiotics.length > 0
      ) && (
        <div className="card p-8 rounded-2xl mb-8">
          <h3 className="text-lg font-semibold font-source text-primary mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-3 text-[#5F9EA0]" />
            Tracked Medications
          </h3>
          
          {/* Missed Medications */}
          {reportData.medicationTracking.missedMedications.length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold font-source text-primary mb-4 flex items-center">
                <AlertCircle className="w-4 h-4 mr-3 text-red-500" />
                Missed Medications
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.missedMedications.map((item, index) => (
                  <div key={index} className="card-inner rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-primary text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Time:</span> {item.timeOfDay || 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* NSAIDs */}
          {reportData.medicationTracking.nsaids.length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold font-source text-primary mb-4 flex items-center">
                <Pill className="w-4 h-4 mr-3 text-orange-500" />
                NSAIDs Taken
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.nsaids.map((item, index) => (
                  <div key={index} className="card-inner rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-primary text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Time:</span> {item.timeOfDay || 'Not specified'}
                          </div>
                          {item.dosage && (
                            <div className="text-sm text-secondary font-roboto">
                              <span className="font-medium">Dosage:</span> {item.dosage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Antibiotics */}
          {reportData.medicationTracking.antibiotics.length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold font-source text-primary mb-4 flex items-center">
                <Pill className="w-4 h-4 mr-3 text-blue-500" />
                Antibiotics Taken
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.antibiotics.map((item, index) => (
                  <div key={index} className="card-inner rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-primary text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-secondary font-roboto">
                            <span className="font-medium">Time:</span> {item.timeOfDay || 'Not specified'}
                          </div>
                          {item.dosage && (
                            <div className="text-sm text-secondary font-roboto">
                              <span className="font-medium">Dosage:</span> {item.dosage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Foods */}
      {reportData.topFoods.length > 0 && (
        <div className="card p-8 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold font-source text-primary mb-6 flex items-center">
            <div className="bg-yellow-100 w-8 h-8 lg:w-10 lg:h-10 rounded-lg mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center">
              <Pizza className="w-5 h-5 text-amber-500" />
            </div>
            Top 5 Most Logged Foods
          </h2>
          <div className="space-y-4">
            {reportData.topFoods.map(([food, count], index) => (
              <div key={index} className="card-inner rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1">
                    <h5 className="font-medium font-roboto text-primary text-base">{food}</h5>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-roboto card-inner text-secondary">
                      {count} time{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {reportData.totalEntries === 0 && reportData.medications.length === 0 && (
        <div className="card p-8 rounded-2xl text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-secondary" />
          <h3 className="text-lg font-semibold text-primary mb-2 font-source">No Data Available</h3>
          <p className="text-secondary mb-4 font-roboto">
            Start logging symptoms and adding medications to generate meaningful reports.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            <a href="/symptoms" className="btn-primary whitespace-nowrap font-roboto">Log Symptoms</a>
            <a href="/medications" className="btn-secondary whitespace-nowrap font-roboto">Add Medications</a>
          </div>
        </div>
      )}
      </div>

      {/* No Data Modal */}
      <ConfirmationModal
        isOpen={showNoDataModal}
        onClose={() => setShowNoDataModal(false)}
        onConfirm={() => setShowNoDataModal(false)}
        title="No Data to Export"
        message="There's no data available for the selected period. Please log some symptoms or add medications before exporting a report."
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
