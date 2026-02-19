import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }
  const accessToken = authHeader.slice(7)
  if (!accessToken) {
    return Response.json({ error: 'Missing access token' }, { status: 401 })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { endpoint, p256dh_key, auth_key, user_agent } = body
  if (!endpoint || !p256dh_key || !auth_key) {
    return Response.json({ error: 'Missing endpoint, p256dh_key, or auth_key' }, { status: 400 })
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken)
  if (authError || !user) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const { error: upsertError } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh_key,
        auth_key,
        user_agent: user_agent || null
      },
      { onConflict: 'endpoint' }
    )

  if (upsertError) {
    console.error('Push subscribe upsert error:', upsertError)
    return Response.json({ error: upsertError.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
