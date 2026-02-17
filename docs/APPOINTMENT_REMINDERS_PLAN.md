# Appointment push reminders – implementation plan

## Current state

- **Appointments** (`src/app/appointments/page.js`): table has `user_id`, `date`, `time`, `type`, `clinician_name`, `location`, `notes`. No reminder fields or reminder logic.
- **Medication reminders**: `src/app/api/cron/send-reminders/route.js` runs on a schedule, finds medications with `time_of_day` matching current HH:mm, loads `push_subscriptions` for those users, sends web-push. Same auth (Bearer CRON_SECRET) and VAPID setup.
- **Cron schedule**: `vercel.json` has one cron (`send-reminders`). Docs say minute-level is done via cron-job.org; same trigger can call a second route.

## 1. Database: appointment reminder fields

Add two columns to `appointments` (new migration under `supabase/migrations/`):

- **`reminder_minutes_before`** (integer, nullable): e.g. `15`, `60`, `1440` (24h). `NULL` = no reminder.
- **`reminder_sent_at`** (timestamptz, nullable): set when we send a reminder so we do not send twice. Reset to `NULL` when the user edits the appointment's date, time, or reminder setting so they get a new reminder.

RLS: no change; existing policies already govern who can read/write their appointments.

## 2. Appointments UI: reminder preference

In `src/app/appointments/page.js`:

- **Form state**: Add `reminderMinutesBefore: null | 15 | 60 | 1440` (or similar) to the form object. When loading an appointment for edit, set it from `apt.reminderMinutesBefore` (camelCase from DB `reminder_minutes_before`).
- **Form UI**: Add a "Remind me" control (e.g. dropdown or radio): "No reminder" (null), "15 minutes before", "1 hour before", "24 hours before". Optional: only show if `isPushSupported()` so we don't suggest reminders without push (or show for all and rely on "Enable push in Settings").
- **Submit payload**: Include `reminder_minutes_before` in the insert/update payload. Do **not** send `reminder_sent_at` from the client (server/cron sets it).
- **After update**: When the user edits an appointment, the backend (or client if you prefer) should set `reminder_sent_at = null` so a new reminder is sent for the new date/time. Easiest: in the update payload from the client, explicitly set `reminder_sent_at: null` so the reminder is "reset".

## 3. New cron route: send appointment reminders

New file: **`src/app/api/cron/send-appointment-reminders/route.js`**

- **Auth**: Same as meds: `Authorization: Bearer <CRON_SECRET>`; reject if missing or wrong.
- **VAPID**: Same `webPush.setVapidDetails(...)` and Supabase service-role client.
- **Logic**:
  - Now = current server time (use same timezone assumption as the rest of the app; if meds use local server time, use that for "now").
  - Find appointments where:
    - `reminder_sent_at IS NULL`
    - `reminder_minutes_before IS NOT NULL`
    - Appointment datetime = `date` + `time` (treat as same timezone as "now").
    - "Reminder due" = appointment datetime − `reminder_minutes_before` (in minutes).
    - Reminder due ≤ now (e.g. "reminder_due_at <= now").
  - Optional: cap "reminder due" to a small window (e.g. last 15 minutes) so we don't resend if cron was down; then sending the reminder sets `reminder_sent_at = now()` and we never send again for that row.
  - Get distinct `user_id` for those appointments; load `push_subscriptions` for those users (same query shape as meds).
  - For each user, build one notification (e.g. title: "Upcoming appointment", body: list of appointments and their date/time/type). Use a distinct `tag` (e.g. `flarecare-appointment-reminder`) so it doesn't replace medication reminders.
  - Send web-push to each subscription; on 410/404 remove that subscription.
  - For each appointment we sent for, set `reminder_sent_at = now()` (update by appointment id).

**Timezone**: If the app stores `date` + `time` without timezone, define "now" consistently (e.g. UTC or one fixed offset). The cron should use the same convention so "reminder_due_at <= now" is correct.

## 4. Cron trigger

- **If using cron-job.org**: Add a second job (or reuse the same schedule) that calls `POST /api/cron/send-appointment-reminders` with the same Bearer token. Same frequency as medication reminders (e.g. every 15 minutes) is enough so "15 min before" and "1 hour before" are roughly on time.
- **Vercel**: If you add a second cron in `vercel.json`, add an entry for `path: "/api/cron/send-appointment-reminders"` with the same schedule as `send-reminders` (or the one you use in production).

## 5. Service worker

`public/sw.js` already has a `push` listener that shows a notification from the event's payload. Reuse it: the new cron sends the same shape (title, body, tag). No change required unless you want appointment-specific icons or actions.

## 6. Docs

Update `docs/WEB_PUSH_SETUP.md` to mention the second route and that both crons (medication + appointment reminders) must be triggered with the same CRON_SECRET.

---

## Flow summary

```
User → App: Add/edit appointment, set "Remind me 1h before"
App → DB: Insert/update appointment (reminder_minutes_before=60, reminder_sent_at=null)
Cron (every 15 min): Select appointments where reminder_sent_at is null and reminder_due <= now
Cron → DB: Select push_subscriptions for those user_ids
Cron → Push: webPush.sendNotification per subscription
Cron → DB: Update appointment set reminder_sent_at = now()
Push → User: Show "Upcoming appointment: ..."
```

## Implementation order

1. Migration: add `reminder_minutes_before`, `reminder_sent_at` to `appointments`.
2. Appointments page: form fields and payload for reminder preference; on update, clear `reminder_sent_at` (e.g. send `reminder_sent_at: null` or rely on trigger).
3. New route: `send-appointment-reminders/route.js` with query, push send, and `reminder_sent_at` update.
4. Cron trigger: document or add second cron for the new route.
5. Docs: WEB_PUSH_SETUP.md updated for both crons.
