import { createClient } from '@supabase/supabase-js'
import webPush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const cronSecret = process.env.CRON_SECRET

// Window in ms: only send if reminder became due in the last 15 minutes (avoids resending if cron was down)
const REMINDER_WINDOW_MS = 15 * 60 * 1000

export async function POST(request) {
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!supabaseUrl || !supabaseServiceKey || !vapidPrivateKey) {
    return new Response('Missing env (Supabase service role or VAPID private key)', { status: 500 })
  }

  webPush.setVapidDetails(
    'mailto:support@flarecare.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKey
  )

  const now = new Date()
  const windowStart = new Date(now.getTime() - REMINDER_WINDOW_MS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch appointments with reminders set, not yet sent
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, user_id, date, time, type, clinician_name, location, reminder_minutes_before')
    .is('reminder_sent_at', null)
    .not('reminder_minutes_before', 'is', null)

  if (aptError || !appointments?.length) {
    return Response.json({ sent: 0, message: 'No due appointment reminders or error' })
  }

  // Filter: reminder due time must be in [windowStart, now]
  const dueAppointments = []
  for (const apt of appointments) {
    const timeStr = apt.time && /^\d{2}:\d{2}/.test(apt.time) ? apt.time : '00:00'
    const aptDate = new Date(`${apt.date}T${timeStr}:00`)
    if (isNaN(aptDate.getTime())) continue
    const reminderDueMs = aptDate.getTime() - (apt.reminder_minutes_before * 60 * 1000)
    const reminderDue = new Date(reminderDueMs)
    if (reminderDue <= now && reminderDue >= windowStart) {
      dueAppointments.push(apt)
    }
  }

  if (dueAppointments.length === 0) {
    return Response.json({ sent: 0, message: 'No reminders due in window' })
  }

  const userIds = [...new Set(dueAppointments.map(a => a.user_id))]
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', userIds)

  if (subsError || !subs?.length) {
    return Response.json({ sent: 0, message: 'No push subscriptions for these users' })
  }

  const formatApt = (apt) => {
    const d = apt.date ? new Date(apt.date + 'T12:00:00') : null
    const dateStr = d ? `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}` : ''
    const timeStr = apt.time || ''
    const typeStr = apt.type || 'Appointment'
    return `${typeStr} ${dateStr}${timeStr ? ' ' + timeStr : ''}`.trim()
  }

  let sent = 0
  for (const userId of userIds) {
    const userApts = dueAppointments.filter(a => a.user_id === userId)
    const userSubs = subs.filter(s => s.user_id === userId)
    const body = userApts.length === 1
      ? formatApt(userApts[0])
      : userApts.map(formatApt).join('; ')

    const payload = {
      title: '📅 Upcoming appointment',
      body,
      tag: 'flarecare-appointment-reminder'
    }

    for (const sub of userSubs) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          },
          JSON.stringify(payload),
          { TTL: 60 }
        )
        sent++
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    // Mark reminders as sent
    for (const apt of userApts) {
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', apt.id)
    }
  }

  return Response.json({ sent, appointments: dueAppointments.length })
}
