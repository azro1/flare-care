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

**Vercel Hobby:** Cron is limited to **once per day**. The project uses `0 0 * * *` (midnight UTC) so deployment succeeds. For **minute-level** reminders, use cron-job.org (see below). **Vercel Pro** allows more frequent crons; you could then use `* * * * *` in `vercel.json` to run every minute.

### cron-job.org setup (free, runs every minute)

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. **Create Cronjob** → set:
   - **Title:** e.g. `FlareCare send reminders`
   - **URL:** `https://flare-care.vercel.app/api/cron/send-reminders` (or your production URL)
   - **Request method:** POST
   - **Schedule:** Every minute (e.g. `* * * * *` or use the “Every minute” preset if available)
3. **Request headers:** Add one header:
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET` (the same value as in your Vercel env)
4. Save. The job will call your API every minute so reminders fire at the right time.

## 4. User flow

- User sees the “Enable push” banner (when permission is not yet granted).
- Clicking “Enable push” requests permission, subscribes, and saves the subscription to `push_subscriptions`.
- When the cron runs at reminder time, the API sends a Web Push to each subscription for users with due medications.

## 5. Account / Settings

The Account page has an **Enable** button under Settings → Push notifications. Users can enable push there if they dismissed the banner or allowed notifications via the browser without clicking the banner. Optional later: show “Push enabled” when a subscription exists, and add “Disable push” to remove it.
