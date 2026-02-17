# Web Push (reminders when app is closed)

## 1. Supabase

Run the migration to create `push_subscriptions`:

- Open Supabase Dashboard → SQL Editor.
- Run the contents of `supabase/migrations/20250207000000_push_subscriptions.sql`.

## 2. VAPID keys

Generate once (e.g. on your machine):

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local` (and to your host’s env, e.g. Vercel):

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` – public key (used in the browser to subscribe).
- `VAPID_PRIVATE_KEY` – private key (only on the server; used by the cron API to send push).

## 3. Cron (sending reminders)

The API route `POST /api/cron/send-reminders` sends Web Push for medications due at the current minute. It needs:

- `SUPABASE_SERVICE_ROLE_KEY` – in Supabase: Project Settings → API → service_role.
- `CRON_SECRET` – a secret you choose; the cron job must send `Authorization: Bearer <CRON_SECRET>`.

Example (Vercel Cron in `vercel.json`):

```json
{
  "crons": [{ "path": "/api/cron/send-reminders", "schedule": "* * * * *" }]
}
```

Vercel will call the route every minute with the correct auth. For other hosts, call the URL every minute and set the `Authorization` header to `Bearer <CRON_SECRET>`.

## 4. User flow

- User sees the “Enable push” banner (when permission is not yet granted).
- Clicking “Enable push” requests permission, subscribes, and saves the subscription to `push_subscriptions`.
- When the cron runs at reminder time, the API sends a Web Push to each subscription for users with due medications.

## 5. Optional: Account / Settings

You can add a “Notifications” section under Account that:

- Shows whether push is enabled (e.g. by checking for an existing subscription).
- Lets the user “Disable push” (delete their subscription from `push_subscriptions` and optionally unsubscribe in the browser).
