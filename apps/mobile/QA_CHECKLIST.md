# Mobile QA Checklist

## Authentication

- Sign in with email magic link.
- Sign in with Google OAuth.
- Logout and relaunch retains expected auth state.

## Core Tracking

- Create symptom log and verify it appears in list.
- Add medication and mark it in tracking log.
- Increment/decrement hydration and verify daily persistence.
- Add bowel movement log and verify ordering.
- Add weight entry and verify value is stored.
- Add appointment and verify it appears in list.

## Reports and Briefs

- Generate report summary.
- Send clinician report email via API.
- Validate API error handling when endpoint is unavailable.

## Notifications

- Grant permission on iOS and Android physical devices.
- Register Expo token and verify `/api/push/subscribe` accepts `expo_push_token`.
- Confirm daily medication notifications are scheduled.
- Confirm stocked supply orders schedule a **09:00 local** due-date alert; empty kits skip; tap opens that order.
- Confirm Reminders screen count includes supply alarms when permission is on.

## Release Readiness

- Run `npx tsc --noEmit` in `apps/mobile`.
- Build `preview` and `production` profiles with EAS.
- Validate app icons/splash, metadata, and bundle IDs/package names.
