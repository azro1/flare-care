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

export async function POST(request) {
  try {
    const body = await request.json()
    const { consultantEmail, consultantName, note, period, summary } = body || {}

    if (!consultantEmail || !period || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields (email, period, summary).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const senderEmail = process.env.RESEND_SENDER_EMAIL
    const senderName = process.env.RESEND_SENDER_NAME || 'FlareCare Reports'

    if (!apiKey || !senderEmail) {
      console.warn('RESEND_API_KEY or RESEND_SENDER_EMAIL is not set; skipping send.')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const subject = 'FlareCare symptom & treatment report for your patient'

    const totalEntries = summary?.totalEntries ?? 0
    const severityTrend = Array.isArray(summary?.severityTrend) ? summary.severityTrend : []
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
    textLines.push(`Symptom entries in this period: ${totalEntries}`, '')

    if (severityTrend.length) {
      textLines.push('Symptom episodes:')
      severityTrend.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const end = entry.isOngoing ? 'ongoing' : entry.endDate ? formatUKDate(entry.endDate) : 'end date not recorded'
        const sev = entry.severity != null ? `${entry.severity}/10` : 'n/a'
        const stress = entry.stressLevel != null ? `${entry.stressLevel}/10` : 'n/a'
        textLines.push(`• ${date} → ${end} | severity ${sev}, stress ${stress}`)
      })
      textLines.push('')
    }
    if (currentMeds.length) {
      textLines.push('Current medications:')
      currentMeds.forEach((med) => {
        const name = med.name || 'Unnamed medication'
        const dosage = med.dosage ? ` – ${med.dosage}` : ''
        textLines.push(`• ${name}${dosage}`)
      })
      textLines.push('')
    }
    if (appointments.length) {
      textLines.push('Appointments:')
      appointments.forEach((apt) => {
        const date = formatUKDate(apt.date)
        const time = apt.time ? ` at ${apt.time}` : ''
        const type = apt.type ? ` – ${apt.type}` : ''
        textLines.push(`• ${date}${time}${type}`)
      })
      textLines.push('')
    }
    if (weightEntries.length) {
      textLines.push('Weight logs:')
      weightEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const value = entry.value_kg != null ? `${entry.value_kg} kg` : 'no value recorded'
        textLines.push(`• ${date} – ${value}`)
      })
      textLines.push('')
    }
    if (hydrationEntries.length) {
      textLines.push('Hydration logs:')
      hydrationEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const glasses = entry.glasses != null ? entry.glasses : 'n/a'
        const met = entry.targetMet ? ' (target met)' : ''
        textLines.push(`• ${date} – ${glasses}/${hydrationTarget} glasses${met}`)
      })
      textLines.push('')
    }

    if (topFoods.length) {
      textLines.push('Top 5 foods:')
      topFoods.forEach(([food, count]) => {
        textLines.push(`• ${food} – ${count} time${count === 1 ? '' : 's'}`)
      })
      textLines.push('')
    }
    textLines.push(
      'This summary was generated from the patient\'s FlareCare tracking over the selected period.',
      'Please interpret in the context of your clinical judgment.'
    )
    const textBody = textLines.join('\n')

    // HTML body with headings and spacing
    const safe = (v) => (v == null ? '' : String(v))

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
      `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Summary overview</h2>`,
      `<p style="margin: 0 0 6px 0;">Symptom entries in this period: <strong>${totalEntries}</strong></p>`
    )

    if (severityTrend.length) {
      htmlParts.push('<ul style="margin: 0 0 10px 20px; padding: 0;">')
      severityTrend.forEach((entry) => {
        const startDate = formatUKDate(entry.date)
        const endDate = entry.isOngoing ? 'ongoing' : entry.endDate ? formatUKDate(entry.endDate) : 'end date not recorded'
        const sev = entry.severity != null ? `${entry.severity}/10` : 'n/a'
        const stress = entry.stressLevel != null ? `${entry.stressLevel}/10` : 'n/a'
        htmlParts.push(
          `<li>${startDate} → ${endDate} · severity ${sev}, stress ${stress}</li>`
        )
      })
      htmlParts.push('</ul>')
    }

    if (currentMeds.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Current medications</h2>`,
        '<ul style="margin: 0 0 10px 20px; padding: 0;">'
      )
      currentMeds.forEach((med) => {
        const name = med.name || 'Unnamed medication'
        const dosage = med.dosage ? ` – ${safe(med.dosage)}` : ''
        htmlParts.push(`<li>${safe(name)}${dosage}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (missed.length || nsaids.length || antibiotics.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Medication logs</h2>`
      )
      if (missed.length) {
        htmlParts.push('<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Missed medications</h3><ul style="margin: 0 0 10px 20px; padding: 0;">')
        missed.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || 'time not specified'
          htmlParts.push(`<li>${safe(medName)} on ${safe(date)} (${safe(time)})</li>`)
        })
        htmlParts.push('</ul>')
      }
      if (nsaids.length) {
        htmlParts.push('<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">NSAIDs taken</h3><ul style="margin: 0 0 10px 20px; padding: 0;">')
        nsaids.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || 'time not specified'
          htmlParts.push(`<li>${safe(medName)} on ${safe(date)} (${safe(time)})</li>`)
        })
        htmlParts.push('</ul>')
      }
      if (antibiotics.length) {
        htmlParts.push('<h3 style="margin: 14px 0 3px; font-size: 15px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Antibiotics taken</h3><ul style="margin: 0 0 10px 20px; padding: 0;">')
        antibiotics.forEach((item) => {
          const medName = item.medication || 'Medication'
          const date = formatUKDate(item.date)
          const time = item.timeOfDay || 'time not specified'
          htmlParts.push(`<li>${safe(medName)} on ${safe(date)} (${safe(time)})</li>`)
        })
        htmlParts.push('</ul>')
      }
    }

    if (appointments.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Appointments</h2>`,
        '<ul style="margin: 0 0 10px 20px; padding: 0;">'
      )
      appointments.forEach((apt) => {
        const date = formatUKDate(apt.date)
        const time = apt.time ? ` at ${safe(apt.time)}` : ''
        const type = apt.type ? ` – ${safe(apt.type)}` : ''
        htmlParts.push(`<li>${safe(date)}${time}${type}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (weightEntries.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Weight logs</h2>`,
        '<ul style="margin: 0 0 10px 20px; padding: 0;">'
      )
      weightEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const value = entry.value_kg != null ? `${entry.value_kg} kg` : 'no value recorded'
        htmlParts.push(`<li>${safe(date)} – ${safe(value)}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (hydrationEntries.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Hydration</h2>`,
        '<ul style="margin: 0 0 10px 20px; padding: 0;">'
      )
      hydrationEntries.forEach((entry) => {
        const date = formatUKDate(entry.date)
        const glasses = entry.glasses != null ? entry.glasses : 'n/a'
        const met = entry.targetMet ? ' (target met)' : ''
        htmlParts.push(`<li>${safe(date)} – ${safe(glasses)}/${hydrationTarget} glasses${safe(met)}</li>`)
      })
      htmlParts.push('</ul>')
    }

    if (topFoods.length) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Top 5 foods</h2>`,
        '<ul style="margin: 0 0 10px 20px; padding: 0;">'
      )
      topFoods.forEach(([food, count]) => {
        htmlParts.push(
          `<li>${safe(food)} – ${safe(count)} time${count === 1 ? '' : 's'}</li>`
        )
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
      text: textBody,
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

