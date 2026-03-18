import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function formatUKDate(value) {
  if (!value) return 'unknown date'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function getSeverityLabel(severity) {
  const n = Number(severity)
  if (!Number.isFinite(n)) return ''
  if (n <= 2) return 'Very Mild'
  if (n <= 4) return 'Mild'
  if (n <= 6) return 'Moderate'
  if (n <= 8) return 'Severe'
  return 'Very Severe'
}

function getStressLabel(stress) {
  const n = Number(stress)
  if (!Number.isFinite(n)) return ''
  if (n <= 2) return 'Very Low'
  if (n <= 4) return 'Low'
  if (n <= 6) return 'Moderate'
  if (n <= 8) return 'High'
  return 'Very High'
}

function formatMeals(symptom) {
  if (!symptom) return ''

  // New format: structured meals
  if (symptom.breakfast || symptom.lunch || symptom.dinner) {
    const mealSections = []
    const buildItems = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((item) => (item?.quantity ? `${item.food} (${item.quantity})` : item?.food))
        .filter(Boolean)
        .join(', ')

    const breakfastItems = buildItems(symptom.breakfast)
    const lunchItems = buildItems(symptom.lunch)
    const dinnerItems = buildItems(symptom.dinner)

    if (breakfastItems) mealSections.push(`Breakfast: ${breakfastItems}`)
    if (lunchItems) mealSections.push(`Lunch: ${lunchItems}`)
    if (dinnerItems) mealSections.push(`Dinner: ${dinnerItems}`)

    return mealSections.length ? mealSections.join(' | ') : ''
  }

  // Old format: comma-separated foods string
  if (typeof symptom.foods === 'string' && symptom.foods.trim()) return symptom.foods.trim()

  return ''
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { consultantEmail, consultantName, note, period, summary, detailedSymptoms, prefs } = body || {}

    if (!consultantEmail || !period || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields (email, period, summary).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const senderEmail = process.env.RESEND_SENDER_EMAIL
    const senderName = process.env.RESEND_SENDER_NAME || 'FlareCare Report'

    if (!apiKey || !senderEmail) {
      console.warn('RESEND_API_KEY or RESEND_SENDER_EMAIL is not set; skipping send.')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const subject = 'FlareCare symptom & treatment report for your patient'

    const totalEntries = summary?.totalEntries ?? 0
    const averageSeverity = summary?.averageSeverity
    const symptomDetails = Array.isArray(detailedSymptoms) ? detailedSymptoms : []
    const currentMeds = Array.isArray(summary?.medications) ? summary.medications : []
    const tracking = summary?.medicationTracking || {}
    const missed = Array.isArray(tracking.missedMedications) ? tracking.missedMedications : []
    const nsaids = Array.isArray(tracking.nsaids) ? tracking.nsaids : []
    const antibiotics = Array.isArray(tracking.antibiotics) ? tracking.antibiotics : []
    const appointments = Array.isArray(summary?.appointments) ? summary.appointments : []
    const weightEntries = Array.isArray(summary?.weightEntries) ? summary.weightEntries : []
    const hydrationEntries = Array.isArray(summary?.hydrationEntries) ? summary.hydrationEntries : []
    const hydrationTarget = summary?.hydrationTarget || 6
    const topFoods = Array.isArray(summary?.topFoods) ? summary.topFoods : []

    // Plain-text fallback (simple version of the HTML)
    const textLines = []
    textLines.push(
      consultantName ? `${consultantName},` : 'Clinician,',
      '',
    )
    if (note) {
      textLines.push(note, '')
    }
    if (period?.start && period?.end) {
      textLines.push(`Report period: ${formatUKDate(period.start)} to ${formatUKDate(period.end)}`, '')
    }
    textLines.push('Summary', `Total Symptom Entries: ${totalEntries}`)
    if (averageSeverity != null && !Number.isNaN(Number(averageSeverity))) {
      textLines.push(`Average Severity: ${Number(averageSeverity).toFixed(1)}/10`)
    }
    textLines.push('')
    if (currentMeds.length) {
      textLines.push('Current Medications')
      currentMeds.forEach((med) => {
        const name = med.name || 'Unnamed medication'
        const dosage = med.dosage ? ` (${med.dosage})` : ''
        textLines.push(`• ${name}${dosage}`)
      })
      textLines.push('')
    }
    // Medication logs
    if (missed.length || nsaids.length || antibiotics.length) {
      textLines.push('Medication logs')
      if (missed.length) {
        textLines.push('Missed Medications:')
        missed.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          textLines.push(`• ${medName} - ${date}${time ? ` (${time})` : ''}`)
        })
        textLines.push('')
      }
      if (nsaids.length) {
        textLines.push('NSAIDs Taken:')
        nsaids.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          const dosage = item.dosage ? ` - Dosage: ${item.dosage}` : ''
          textLines.push(`• ${medName} - ${date}${time ? ` (${time})` : ''}${dosage}`)
        })
        textLines.push('')
      }
      if (antibiotics.length) {
        textLines.push('Antibiotics Taken:')
        antibiotics.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          const dosage = item.dosage ? ` - Dosage: ${item.dosage}` : ''
          textLines.push(`• ${medName} - ${date}${time ? ` (${time})` : ''}${dosage}`)
        })
        textLines.push('')
      }
    }
    if (appointments.length) {
      textLines.push('Appointments')
      appointments.forEach((apt) => {
        const date = formatUKDate(apt.date)
        const time = apt.time ? ` ${apt.time}` : ''
        const type = apt.type ? ` - ${apt.type}` : ''
        textLines.push(`${date}${time}${type}`)
        if (apt.clinician_name) textLines.push(`Clinician: ${apt.clinician_name}`)
        if (apt.location) textLines.push(`Location: ${apt.location}`)
        if (apt.notes) textLines.push(`Notes: ${apt.notes}`)
        textLines.push('')
      })
    }
    if (weightEntries.length) {
      textLines.push('Weight Logs')
      weightEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const value = entry.value_kg != null ? `${entry.value_kg} kg` : 'no value recorded'
        textLines.push(`${date} - ${value}`)
        if (entry.notes) textLines.push(`Notes: ${entry.notes}`)
        textLines.push('')
      })
    }
    if (hydrationEntries.length) {
      textLines.push('Hydration')
      hydrationEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const glasses = entry.glasses != null ? entry.glasses : 'n/a'
        const met = entry.targetMet ? ' (target met)' : ''
        textLines.push(`${date} - ${glasses}/${hydrationTarget} glasses${met}`)
      })
      textLines.push('')
    }

    if (topFoods.length) {
      textLines.push('Top 5 Most Logged Foods')
      topFoods.forEach(([food, count]) => {
        textLines.push(`• ${food} (${count} times)`)
      })
      textLines.push('')
    }

    if (symptomDetails.length) {
      textLines.push('Symptoms')
      symptomDetails.forEach((symptom, idx) => {
        const start = formatUKDate(symptom.symptomStartDate)
        const end = symptom.isOngoing ? null : symptom.symptomEndDate ? formatUKDate(symptom.symptomEndDate) : null
        textLines.push(`${idx + 1}. ${end ? `${start} - ${end}` : start}`)

        if (symptom.severity != null) {
          textLines.push(`   Severity: ${symptom.severity}/10 (${getSeverityLabel(symptom.severity)})`)
        }
        if (symptom.stress_level != null) {
          textLines.push(`   Stress Level: ${symptom.stress_level}/10 (${getStressLabel(symptom.stress_level)})`)
        }
        textLines.push(`   Status: ${symptom.isOngoing ? 'Ongoing' : 'Resolved'}`)

        // Smoking
        if (symptom.smoking === true) {
          textLines.push(`   Smoking: ${symptom.smoking_details ? symptom.smoking_details : 'Yes'}`)
        } else if (symptom.smoking === false) {
          const smokingLabel = prefs?.isSmoker === false ? 'Non-smoker' : 'No'
          textLines.push(`   Smoking: ${smokingLabel}`)
        }

        // Alcohol
        if (symptom.alcohol === true) {
          const units = symptom.alcohol_units
          textLines.push(
            `   Alcohol: ${units ? `${units} ${String(units) === '1' ? 'unit' : 'units'} per day` : 'Yes'}`
          )
        } else if (symptom.alcohol === false) {
          const alcoholLabel = prefs?.isDrinker === false ? 'Non-drinker' : 'No'
          textLines.push(`   Alcohol: ${alcoholLabel}`)
        }

        if (symptom.normal_bathroom_frequency) {
          textLines.push(`   Bathroom Frequency: ${symptom.normal_bathroom_frequency} times per day`)
        }
        if (symptom.bathroom_frequency_changed) {
          textLines.push(`   Frequency Changed: ${symptom.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}`)
        }
        if (symptom.bathroom_frequency_change_details) {
          textLines.push(`   Change Details: ${symptom.bathroom_frequency_change_details}`)
        }

        const meals = formatMeals(symptom)
        if (meals) {
          textLines.push(`   Meals: ${meals}`)
        }

        // Notes last (matches PDF ordering)
        if (symptom.notes && String(symptom.notes).trim()) {
          textLines.push(`   Notes: ${String(symptom.notes).trim()}`)
        }

        textLines.push('')
      })
    }
    textLines.push(
      'This summary was generated from the patient\'s FlareCare tracking over the selected period.',
      'Please interpret in the context of your clinical judgment.'
    )
    const textBody = textLines.join('\n')

    // HTML body with headings and spacing
    const safe = (v) => (v == null ? '' : String(v))
    const ulStyle = 'list-style-type: none; margin: 0 0 10px 0; padding: 0;'

    const htmlParts = []
    htmlParts.push(
      '<!doctype html><html><body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">'
    )
    htmlParts.push(
      `<p>${consultantName ? `${safe(consultantName)},` : 'Clinician,'}</p>`
    )
    if (note) {
      htmlParts.push(
        `<p>${safe(note)}</p>`
      )
    }
    if (period?.start && period?.end) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Report period</h2>`,
        `<p style="margin: 0 0 10px 0;">${formatUKDate(period.start)} to ${formatUKDate(period.end)}</p>`
      )
    }

    htmlParts.push(
      `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Summary</h2>`,
      `<p style="margin: 0 0 3px 0;">Total Symptom Entries: <strong>${totalEntries}</strong></p>`
    )
    if (averageSeverity != null && !Number.isNaN(Number(averageSeverity))) {
      htmlParts.push(
        `<p style="margin: 0 0 10px 0;">Average Severity: <strong>${Number(averageSeverity).toFixed(1)}/10</strong></p>`
      )
    } else {
      htmlParts.push(`<div style="height: 10px;"></div>`)
    }

    if (currentMeds.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Current Medications</h2>`,
        `<ul style="${ulStyle}">`
      )
      currentMeds.forEach((med) => {
        const name = med.name || 'Unnamed medication'
        const dosage = med.dosage ? ` (${safe(med.dosage)})` : ''
        htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(name)}${dosage}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (missed.length || nsaids.length || antibiotics.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Medication logs</h2>`
      )
      if (missed.length) {
        htmlParts.push(`<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Missed Medications:</h3><ul style="${ulStyle}">`)
        missed.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(medName)} - ${safe(date)}${time ? ` (${safe(time)})` : ''}</li>`)
        })
        htmlParts.push('</ul>')
      }
      if (nsaids.length) {
        htmlParts.push(`<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">NSAIDs Taken:</h3><ul style="${ulStyle}">`)
        nsaids.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          const dosage = item.dosage ? ` - Dosage: ${safe(item.dosage)}` : ''
          htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(medName)} - ${safe(date)}${time ? ` (${safe(time)})` : ''}${dosage}</li>`)
        })
        htmlParts.push('</ul>')
      }
      if (antibiotics.length) {
        htmlParts.push(`<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Antibiotics Taken:</h3><ul style="${ulStyle}">`)
        antibiotics.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || ''
          const dosage = item.dosage ? ` - Dosage: ${safe(item.dosage)}` : ''
          htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(medName)} - ${safe(date)}${time ? ` (${safe(time)})` : ''}${dosage}</li>`)
        })
        htmlParts.push('</ul>')
      }
    }

    if (appointments.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Appointments</h2>`
      )
      appointments.forEach((apt) => {
        const date = formatUKDate(apt.date)
        const time = apt.time ? ` ${safe(apt.time)}` : ''
        const type = apt.type ? ` - ${safe(apt.type)}` : ''
        htmlParts.push('<div style="margin: 0 0 10px 0;">')
        htmlParts.push(`<p style="margin: 0 0 2px 0;">${safe(date)}${time}${type}</p>`)
        if (apt.clinician_name) htmlParts.push(`<p style="margin: 0 0 2px 0;">Clinician: ${safe(apt.clinician_name)}</p>`)
        if (apt.location) htmlParts.push(`<p style="margin: 0 0 2px 0;">Location: ${safe(apt.location)}</p>`)
        if (apt.notes) htmlParts.push(`<p style="margin: 0;">Notes: ${safe(apt.notes)}</p>`)
        htmlParts.push('</div>')
      })
    }

    if (weightEntries.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Weight logs</h2>`,
      )
      weightEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const value = entry.value_kg != null ? `${entry.value_kg} kg` : 'no value recorded'
        htmlParts.push(`<p style="margin: 0 0 3px 0;">${safe(date)} - ${safe(value)}</p>`)
        if (entry.notes) htmlParts.push(`<p style="margin: 0 0 10px 0;">Notes: ${safe(entry.notes)}</p>`)
        else htmlParts.push(`<div style="height: 10px;"></div>`)
      })
    }

    if (hydrationEntries.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Hydration</h2>`,
        `<ul style="${ulStyle}">`
      )
      hydrationEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const glasses = entry.glasses != null ? entry.glasses : 'n/a'
        const met = entry.targetMet ? ' (target met)' : ''
        htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(date)} - ${safe(glasses)}/${hydrationTarget} glasses${safe(met)}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (symptomDetails.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Symptoms</h2>`
      )
      symptomDetails.forEach((symptom, idx) => {
        const start = formatUKDate(symptom.symptomStartDate)
        const end = symptom.isOngoing ? null : symptom.symptomEndDate ? formatUKDate(symptom.symptomEndDate) : null
        const dateText = end ? `${start} - ${end}` : start
        // Match the subheading (h3) sizing for symptom entry titles
        htmlParts.push(`<p style="margin: 14px 0 3px 0; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif; line-height: 1.25;">${idx + 1}. ${safe(dateText)}</p>`)

        if (symptom.severity != null) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Severity: ${safe(symptom.severity)}/10 (${safe(getSeverityLabel(symptom.severity))})</p>`)
        }
        if (symptom.stress_level != null) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Stress Level: ${safe(symptom.stress_level)}/10 (${safe(getStressLabel(symptom.stress_level))})</p>`)
        }
        htmlParts.push(`<p style="margin: 0 0 3px 0;">Status: ${symptom.isOngoing ? 'Ongoing' : 'Resolved'}</p>`)

        if (symptom.smoking === true) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Smoking: ${safe(symptom.smoking_details || 'Yes')}</p>`)
        } else if (symptom.smoking === false) {
          const smokingLabel = prefs?.isSmoker === false ? 'Non-smoker' : 'No'
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Smoking: ${safe(smokingLabel)}</p>`)
        }

        if (symptom.alcohol === true) {
          const units = symptom.alcohol_units
          const alcoholText = units ? `${units} ${String(units) === '1' ? 'unit' : 'units'} per day` : 'Yes'
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Alcohol: ${safe(alcoholText)}</p>`)
        } else if (symptom.alcohol === false) {
          const alcoholLabel = prefs?.isDrinker === false ? 'Non-drinker' : 'No'
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Alcohol: ${safe(alcoholLabel)}</p>`)
        }

        if (symptom.normal_bathroom_frequency) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Bathroom Frequency: ${safe(symptom.normal_bathroom_frequency)} times per day</p>`)
        }
        if (symptom.bathroom_frequency_changed) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Frequency Changed: ${symptom.bathroom_frequency_changed === 'yes' ? 'Yes' : 'No'}</p>`)
        }
        if (symptom.bathroom_frequency_change_details) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Change Details: ${safe(symptom.bathroom_frequency_change_details)}</p>`)
        }

        const meals = formatMeals(symptom)
        if (meals) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Meals: ${safe(meals)}</p>`)
        }

        // Notes last (matches PDF ordering)
        if (symptom.notes && String(symptom.notes).trim()) {
          htmlParts.push(`<p style="margin: 0 0 3px 0;">Notes: ${safe(String(symptom.notes).trim())}</p>`)
        }
      })
    }

    if (topFoods.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Top 5 Most Logged Foods</h2>`,
        `<ul style="${ulStyle}">`
      )
      topFoods.forEach(([food, count]) => {
        htmlParts.push(`<li style="margin: 0 0 4px 0;">• ${safe(food)} (${safe(count)} times)</li>`)
      })
      htmlParts.push('</ul>')
    }

    htmlParts.push(
      `<p style="margin-top: 24px;">This summary was generated from the patient's FlareCare tracking over the selected period. Please interpret in the context of your clinical judgment.</p>`,
      '</body></html>'
    )

    const htmlBody = htmlParts.join('')

    const payload = {
      from: `${senderName} <${senderEmail}>`,
      to: [consultantEmail],
      subject,
      html: htmlBody,
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('Resend API error', response.status, text)
      return NextResponse.json(
        { error: 'Failed to send email via Resend.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in send-report-email route:', error)
    return NextResponse.json(
      { error: 'Failed to send email.' },
      { status: 500 }
    )
  }
}

