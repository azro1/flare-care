'use client'

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import ConfirmationModal from '@/components/ConfirmationModal'
import DatePicker from '@/components/DatePicker'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

function ReportsPageContent() {
  const { user } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [medications, setMedications] = useState([])
  const [reportData, setReportData] = useState(null)
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

  useEffect(() => {
    generateReport()
  }, [symptoms, medications, dateRange])

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
        isOngoing: symptom.isOngoing,
        endDate: symptom.symptomEndDate
      }))

    // Use the selected date range for the report period
    const reportStartDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date()
    const reportEndDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date()

    // Get medication tracking data
    const medicationTracking = medications.find(med => med.name === 'Medication Tracking')
    
    setReportData({
      period: {
        start: reportStartDate.toISOString().split('T')[0],
        end: reportEndDate.toISOString().split('T')[0]
      },
      averageSeverity: parseFloat(averageSeverity),
      totalEntries: allSymptoms.length,
      topFoods,
      severityTrend,
      medications: medications.filter(med => med.name !== 'Medication Tracking').map(med => ({
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay
      })),
      medicationTracking: {
        missedMedications: medicationTracking?.missed_medications_list || [],
        nsaids: medicationTracking?.nsaid_list || [],
        antibiotics: medicationTracking?.antibiotic_list || []
      }
    })
  }

  const hasDataToExport = () => {
    if (!reportData) return false
    return reportData.totalEntries > 0 || reportData.medications.length > 0
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
          doc.text(`• ${item.medication} - ${dateText} (${item.timeOfDay})`, margin + 10, yPosition)
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
          doc.text(`• ${item.medication} - ${dateText} (${item.timeOfDay})`, margin + 10, yPosition)
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
    const medicationTracking = medications.find(med => med.name === 'Medication Tracking')
    
    if (medicationTracking) {
      // Add section separator
      csvData.push([])
      csvData.push(['TRACKED MEDICATIONS'])
      csvData.push([])
      
      // Missed Medications
      if (medicationTracking.missed_medications_list?.length > 0) {
        csvData.push(['Missed Medications'])
        csvData.push(['Medication', 'Date', 'Time of Day'])
        medicationTracking.missed_medications_list.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || ''
          ])
        })
        csvData.push([])
      }
      
      // NSAIDs
      if (medicationTracking.nsaid_list?.length > 0) {
        csvData.push(['NSAIDs Taken'])
        csvData.push(['Medication', 'Date', 'Time of Day'])
        medicationTracking.nsaid_list.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || ''
          ])
        })
        csvData.push([])
      }
      
      // Antibiotics
      if (medicationTracking.antibiotic_list?.length > 0) {
        csvData.push(['Antibiotics Taken'])
        csvData.push(['Medication', 'Date', 'Time of Day'])
        medicationTracking.antibiotic_list.forEach(item => {
          csvData.push([
            item.medication || '',
            item.date ? formatUKDate(item.date) : '',
            item.timeOfDay || ''
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

  if (!reportData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'var(--bg-main)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-primary font-roboto">Generating report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl w-full mx-auto px-2 sm:px-3 md:px-6 lg:px-8 min-w-0">
      <div className="mb-6 sm:mb-8 md:mb-10 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Health Reports</h1>
        <p className="text-gray-600 font-roboto">
          Generate detailed reports of your health data to share with your healthcare team.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 md:p-8 mb-8 sm:mb-12 min-w-0 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center mb-4 sm:mb-6 min-w-0">
          <div className="hidden sm:flex bg-violet-500 p-3 rounded-2xl mr-4 flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold font-source text-gray-900 flex-1">Select Report Period</h2>
        </div>
        
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-3 sm:gap-2 mb-4 sm:mb-6 min-w-0">
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-roboto"
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-roboto"
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-roboto"
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
            className="px-4 py-2 sm:px-3 sm:py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-roboto"
          >
            All time
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              Start Date
            </label>
            <DatePicker
              id="startDate"
              value={dateRange.startDate}
              onChange={(value) => setDateRange(prev => ({ ...prev, startDate: value }))}
              placeholder="Select start date"
              className="w-full px-2 py-1.5 text-left bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 hover:border-gray-300 appearance-none bg-no-repeat bg-right pr-10"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium font-roboto text-gray-700 mb-2">
              End Date
            </label>
            <DatePicker
              id="endDate"
              value={dateRange.endDate}
              onChange={(value) => setDateRange(prev => ({ ...prev, endDate: value }))}
              placeholder="Select end date"
              className="w-full px-2 py-1.5 text-left bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 hover:border-gray-300 appearance-none bg-no-repeat bg-right pr-10"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="text-sm text-gray-600 sm:max-w-md sm:pr-4 font-roboto flex-1">
            Showing symptoms from {formatUKDate(dateRange.startDate)} to {formatUKDate(dateRange.endDate)}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0 items-center sm:items-stretch">
            <button onClick={() => handleExportClick(exportToPDF)} className="inline-flex items-center justify-center px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
            <button onClick={() => handleExportClick(exportToCSV)} className="inline-flex items-center justify-center px-6 py-3 btn-secondary whitespace-nowrap w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 md:p-8 mb-8 sm:mb-12 min-w-0 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center mb-4 sm:mb-6 min-w-0">
          <div className="hidden sm:flex bg-violet-500 p-3 rounded-2xl mr-4 flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold font-source text-gray-900 flex-1">Symptom Report</h2>
        </div>
        
        {reportData.totalEntries > 0 && (
          <div className="text-sm text-gray-600 mb-6 font-roboto">
            Found {reportData.totalEntries} symptom {reportData.totalEntries === 1 ? 'episode' : 'episodes'} in the selected period
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 min-w-0">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 text-center border border-blue-200">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-violet-500 p-2 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-violet-600 mb-2">
              {reportData.totalEntries}
            </div>
            <div className="text-gray-700 font-medium">Symptom Episodes</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 text-center border border-blue-200">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-violet-500 p-2 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getSeverityColor(reportData.averageSeverity).split(' ')[0]}`}>
              {reportData.averageSeverity}
            </div>
            <div className="text-gray-700 font-medium">Average Severity</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 text-center border border-blue-200">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-violet-500 p-2 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-violet-600 mb-2">
              {reportData.medications.length}
            </div>
            <div className="text-gray-700 font-medium">Medications</div>
          </div>
        </div>

        {/* Severity Trend */}
        {reportData.severityTrend.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold font-source text-gray-900 mb-4">Symptom Episodes</h3>
            <div className="space-y-3 sm:space-y-4">
              {reportData.severityTrend.map((entry, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-32 text-sm text-gray-600 font-roboto">
                    {formatUKDate(entry.date)}
                    {entry.isOngoing ? ' (Ongoing)' : ` - ${formatUKDate(entry.endDate)}`}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${(entry.severity / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium font-roboto ${getSeverityColor(entry.severity)}`}>
                        {entry.severity}/10
                      </span>
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
        <div className="card mb-8 sm:mb-12">
          <h3 className="text-lg font-semibold font-source text-gray-900 mb-6 flex items-center">
            <span className="w-3 h-3 bg-purple-100 rounded-full mr-3 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
            </span>
            Current Medications
          </h3>
          <div className="space-y-4">
            {reportData.medications.map((med, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div>
                  <h5 className="font-medium font-roboto text-gray-900 text-lg">{med.name}</h5>
                  {med.dosage && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600 font-roboto">
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
        <div className="card mb-8 sm:mb-12">
          <h3 className="text-lg font-semibold font-source text-gray-900 mb-6">Tracked Medications</h3>
          
          {/* Missed Medications */}
          {reportData.medicationTracking.missedMedications.length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold font-source text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-100 rounded-full mr-3 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </span>
                Missed Medications
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.missedMedications.map((item, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-gray-900 text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-gray-600 font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-gray-600 font-roboto">
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
              <h4 className="text-md font-semibold font-source text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-orange-100 rounded-full mr-3 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                </span>
                NSAIDs Taken
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.nsaids.map((item, index) => (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-gray-900 text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-gray-600 font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-gray-600 font-roboto">
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
          
          {/* Antibiotics */}
          {reportData.medicationTracking.antibiotics.length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold font-source text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-100 rounded-full mr-3 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                </span>
                Antibiotics Taken
              </h4>
              <div className="space-y-4">
                {reportData.medicationTracking.antibiotics.map((item, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium font-roboto text-gray-900 text-lg">{item.medication}</h5>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 gap-1">
                          <div className="text-sm text-gray-600 font-roboto">
                            <span className="font-medium">Date:</span> {item.date ? formatUKDate(item.date) : 'Not specified'}
                          </div>
                          <div className="text-sm text-gray-600 font-roboto">
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
        </div>
      )}

      {/* Top Foods */}
      {reportData.topFoods.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold font-source text-gray-900 mb-6 flex items-center">
            <span className="w-3 h-3 bg-blue-100 rounded-full mr-3 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            </span>
            Top 5 Most Logged Foods
          </h3>
          <div className="space-y-4">
            {reportData.topFoods.map(([food, count], index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1">
                    <h5 className="font-medium font-roboto text-gray-900 text-lg">{food}</h5>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium font-roboto bg-blue-100 text-blue-800">
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
        <div className="card text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            Start logging symptoms and adding medications to generate meaningful reports.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            <a href="/symptoms" className="btn-primary whitespace-nowrap">Log Symptoms</a>
            <a href="/medications" className="btn-secondary whitespace-nowrap">Add Medications</a>
          </div>
        </div>
      )}

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
