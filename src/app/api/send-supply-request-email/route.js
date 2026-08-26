import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const safe = (value) => (value == null ? '' : String(value))

export async function POST(request) {
  try {
    const body = await request.json()
    const { toEmail, recipientName, note, subject, requestText } = body || {}

    if (!toEmail || !requestText) {
      return NextResponse.json(
        { error: 'Missing required fields (email, request text).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const senderEmail = process.env.RESEND_SENDER_EMAIL
    const senderName = process.env.RESEND_SENDER_NAME || 'Flarecare'

    if (!apiKey || !senderEmail) {
      console.warn('RESEND_API_KEY or RESEND_SENDER_EMAIL is not set; skipping send.')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const emailSubject = subject?.trim() || 'Medical supply request'

    // Body is user-authored. Only prepend an optional greeting / note — no Flarecare footer.
    const textLines = []
    if (recipientName || note) {
      textLines.push(recipientName ? `${safe(recipientName)},` : 'Hello,', '')
      if (note) textLines.push(safe(note), '')
    }
    textLines.push(safe(requestText))
    const textBody = textLines.join('\n')

    const htmlParts = []
    htmlParts.push('<!doctype html><html><body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">')
    if (recipientName || note) {
      htmlParts.push(`<p>${recipientName ? `${safe(recipientName)},` : 'Hello,'}</p>`)
      if (note) htmlParts.push(`<p>${safe(note)}</p>`)
    }
    htmlParts.push(
      `<pre style="white-space: pre-wrap; font-family: Arial, Helvetica, sans-serif; margin: 0;">${safe(requestText)}</pre>`,
      '</body></html>'
    )

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [toEmail],
        subject: emailSubject,
        html: htmlParts.join(''),
        text: textBody,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('Resend API error', response.status, text)
      return NextResponse.json({ error: 'Failed to send email via Resend.' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in send-supply-request-email route:', error)
    return NextResponse.json({ error: 'Failed to send supply request email.' }, { status: 500 })
  }
}
