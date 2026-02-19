# Web Push (reminders when app is closed)

## 1. Supabase

Run migrations in Supabase Dashboard → SQL Editor:

- `supabase/migrations/20250207000000_push_subscriptions.sql` – creates `push_subscriptions`
- `supabase/migrations/20250207100000_appointment_reminder_fields.sql` – adds reminder columns to `appointments`

## 2. VAPID keys

Generate once (e.g. on your machine):

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local` (and to your host’s env, e.g. Vercel):

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` – public key (used in the browser to subscribe).
- `VAPID_PRIVATE_KEY` – private key (only on the server; used by the cron API to send push).

## 3. Cron (sending reminders)

Two API routes send Web Push notifications:

1. **`POST /api/cron/send-reminders`** – medication reminders (due at the current minute).
2. **`POST /api/cron/send-appointment-reminders`** – appointment reminders (15 min, 1 hour, or 24 hours before).

Both need:

- `SUPABASE_SERVICE_ROLE_KEY` – in Supabase: Project Settings → API → service_role.
- `CRON_SECRET` – a secret you choose; each cron job must send `Authorization: Bearer <CRON_SECRET>`.

**Vercel Hobby:** Cron is limited to **once per day**. The project uses `0 0 * * *` (midnight UTC) so deployment succeeds. For **minute-level** reminders, use cron-job.org (see below). **Vercel Pro** allows more frequent crons; you could then use `* * * * *` in `vercel.json` to run every minute.

### cron-job.org setup (free, runs every minute)

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. **Create Cronjob #1 (medications):**
   - **Title:** e.g. `FlareCare medication reminders`
   - **URL:** `https://flare-care.vercel.app/api/cron/send-reminders` (or your production URL)
   - **Request method:** POST
   - **Schedule:** Every minute (e.g. `* * * * *` or use the “Every minute” preset if available)
3. **Create Cronjob #2 (appointments):**
   - **Title:** e.g. `FlareCare appointment reminders`
   - **URL:** `https://flare-care.vercel.app/api/cron/send-appointment-reminders`
   - **Request method:** POST
   - **Schedule:** Every minute
4. For **both** jobs, add request header:
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET` (the same value as in your Vercel env)
5. Save. Both crons will run every minute so medication and appointment reminders fire on time.

## 4. User flow

- User sees the “Enable push” banner (when permission is not yet granted).
- Clicking “Enable push” requests permission, subscribes, and saves the subscription to `push_subscriptions`.
- When the cron runs at reminder time, the API sends a Web Push to each subscription for users with due medications.

## 5. Account / Settings

The Account page has an **Enable** button under Settings → Push notifications. Users can enable push there if they dismissed the banner or allowed notifications via the browser without clicking the banner. Optional later: show “Push enabled” when a subscription exists, and add “Disable push” to remove it.
