import { createClient } from '@supabase/supabase-js'
import webPush from 'web-push'

// Use service role so we can read all medications and push_subscriptions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const cronSecret = process.env.CRON_SECRET

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
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Medications with reminders at this time (exact match)
  const { data: meds, error: medsError } = await supabase
    .from('medications')
    .select('id, name, user_id, time_of_day, reminders_enabled')
    .eq('reminders_enabled', true)
    .eq('time_of_day', currentTime)
    .neq('name', 'Medication Tracking')

  if (medsError || !meds?.length) {
    return Response.json({ sent: 0, message: 'No due medications or error' })
  }

  const userIds = [...new Set(meds.map(m => m.user_id))]
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', userIds)

  if (subsError || !subs?.length) {
    return Response.json({ sent: 0, message: 'No push subscriptions for these users' })
  }

  const payload = {
    title: '💊 Medication Reminder',
    body: meds.length === 1 ? `Time to take: ${meds[0].name}` : `Time to take: ${meds.map(m => m.name).join(', ')}`,
    tag: 'flarecare-reminder'
  }

  let sent = 0
  for (const sub of subs) {
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

  return Response.json({ sent, total: subs.length })
}
