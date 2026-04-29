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

const safe = (value) => (value == null ? '' : String(value))

export async function POST(request) {
  try {
    const body = await request.json()
    const { consultantEmail, consultantName, note, period, briefText, summary } = body || {}

    if (!consultantEmail || !period?.start || !period?.end || !briefText) {
      return NextResponse.json(
        { error: 'Missing required fields (email, period, summary).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const senderEmail = process.env.RESEND_SENDER_EMAIL
    const senderName = process.env.RESEND_SENDER_NAME || 'FlareCare'

    if (!apiKey || !senderEmail) {
      console.warn('RESEND_API_KEY or RESEND_SENDER_EMAIL is not set; skipping send.')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const subject = 'FlareCare appointment brief for your patient'
    const symptoms = summary?.symptoms || {}
    const bowel = summary?.bowel || {}
    const weight = summary?.weight || {}
    const medications = summary?.medications || {}
    const nextAppointment = summary?.nextAppointment || null
    const talkingPoints = Array.isArray(summary?.talkingPoints) ? summary.talkingPoints : []

    const textLines = []
    textLines.push(consultantName ? `${consultantName},` : 'Clinician,', '')
    if (note) textLines.push(note, '')
    textLines.push(`Summary period: ${formatUKDate(period.start)} to ${formatUKDate(period.end)}`, '')
    textLines.push(
      'Summary',
      `Symptoms: ${symptoms.currentCount ?? 0} logs, avg severity ${symptoms.currentAverage != null ? Number(symptoms.currentAverage).toFixed(1) : 'N/A'}/10 (prev ${symptoms.previousAverage != null ? Number(symptoms.previousAverage).toFixed(1) : 'N/A'})`,
      `Bowel: ${bowel.currentCount ?? 0} logs (${bowel.currentPerWeek ?? 0}/week), avg Bristol ${bowel.currentBristolAvg != null ? Number(bowel.currentBristolAvg).toFixed(1) : 'N/A'}`,
      `Weight: ${weight.startWeight != null && weight.endWeight != null ? `${weight.startWeight} kg -> ${weight.endWeight} kg (${weight.delta >= 0 ? '+' : ''}${weight.delta} kg)` : 'Not enough logs in this period'}`,
      `Missed doses: ${medications.missedCurrent ?? 0}`,
      ''
    )

    if (nextAppointment) {
      textLines.push('Next appointment')
      textLines.push(`Date: ${formatUKDate(nextAppointment.date)}${nextAppointment.time ? ` at ${safe(nextAppointment.time)}` : ''}`)
      textLines.push(`Type: ${safe(nextAppointment.type || 'Not set')}`)
      if (nextAppointment.clinician_name) textLines.push(`Clinician: ${safe(nextAppointment.clinician_name)}`)
      if (nextAppointment.location) textLines.push(`Location: ${safe(nextAppointment.location)}`)
      if (nextAppointment.notes) textLines.push(`Notes: ${safe(nextAppointment.notes)}`)
      textLines.push('')
    }

    if (talkingPoints.length) {
      textLines.push('What changed')
      talkingPoints.forEach((point) => textLines.push(`- ${safe(point)}`))
      textLines.push('')
    }

    textLines.push(
      'Generated from FlareCare appointment brief.',
      'Please interpret this summary in the context of your clinical judgment.'
    )

    const textBody = textLines.join('\n')

    const htmlParts = []
    htmlParts.push('<!doctype html><html><body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">')
    htmlParts.push(`<p>${consultantName ? `${safe(consultantName)},` : 'Clinician,'}</p>`)
    if (note) htmlParts.push(`<p>${safe(note)}</p>`)
    htmlParts.push(
      `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600;">Summary period</h2>`,
      `<p style="margin: 0 0 10px 0;">${formatUKDate(period.start)} to ${formatUKDate(period.end)}</p>`,
      `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600;">Summary</h2>`,
      `<p style="margin: 0 0 3px 0;">Symptoms: ${safe(symptoms.currentCount ?? 0)} logs, avg severity <strong>${symptoms.currentAverage != null ? Number(symptoms.currentAverage).toFixed(1) : 'N/A'}/10</strong> (prev ${symptoms.previousAverage != null ? Number(symptoms.previousAverage).toFixed(1) : 'N/A'})</p>`,
      `<p style="margin: 0 0 3px 0;">Bowel: ${safe(bowel.currentCount ?? 0)} logs (${safe(bowel.currentPerWeek ?? 0)}/week), avg Bristol <strong>${bowel.currentBristolAvg != null ? Number(bowel.currentBristolAvg).toFixed(1) : 'N/A'}</strong></p>`,
      `<p style="margin: 0 0 3px 0;">Weight: <strong>${weight.startWeight != null && weight.endWeight != null ? `${safe(weight.startWeight)} kg -> ${safe(weight.endWeight)} kg (${weight.delta >= 0 ? '+' : ''}${safe(weight.delta)} kg)` : 'Not enough logs in this period'}</strong></p>`,
      `<p style="margin: 0 0 10px 0;">Missed doses: <strong>${safe(medications.missedCurrent ?? 0)}</strong></p>`
    )

    if (nextAppointment) {
      htmlParts.push(
        `<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600;">Next appointment</h2>`,
        `<p style="margin: 0 0 2px 0;">Date: ${formatUKDate(nextAppointment.date)}${nextAppointment.time ? ` at ${safe(nextAppointment.time)}` : ''}</p>`,
        `<p style="margin: 0 0 2px 0;">Type: ${safe(nextAppointment.type || 'Not set')}</p>`
      )
      if (nextAppointment.clinician_name) htmlParts.push(`<p style="margin: 0 0 2px 0;">Clinician: ${safe(nextAppointment.clinician_name)}</p>`)
      if (nextAppointment.location) htmlParts.push(`<p style="margin: 0 0 2px 0;">Location: ${safe(nextAppointment.location)}</p>`)
      if (nextAppointment.notes) htmlParts.push(`<p style="margin: 0 0 10px 0;">Notes: ${safe(nextAppointment.notes)}</p>`)
    }

    if (talkingPoints.length) {
      htmlParts.push(`<h2 style="margin-top: 24px; margin-bottom: 3px; font-size: 16px; font-weight: 600;">What changed</h2>`)
      talkingPoints.forEach((point) => {
        htmlParts.push(`<p style="margin: 0 0 3px 0;">- ${safe(point)}</p>`)
      })
    }

    htmlParts.push(
      `<p style="margin-top: 24px;">Generated from FlareCare appointment brief. Please interpret this summary in the context of your clinical judgment.</p>`,
      '</body></html>'
    )

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [consultantEmail],
        subject,
        html: htmlParts.join(''),
        text: textBody,
      }),
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
    console.error('Error in send-appointment-brief-email route:', error)
    return NextResponse.json(
      { error: 'Failed to send appointment brief email.' },
      { status: 500 }
    )
  }
}
