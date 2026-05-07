# Flare Care Mobile

Expo React Native app for iOS and Android parity with the web experience.

## Required environment variables

Set these before running:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_API_BASE_URL` (example: `https://your-web-app.vercel.app`)

## Run locally

- `npm run start`
- `npm run android`
- `npm run ios`

Or from repo root:

- `npm run mobile:start`
- `npm run mobile:android`
- `npm run mobile:ios`

## Firebase Android (`google-services.json`)

Mobile push uses Firebase Cloud Messaging (FCM). Typical flow: create a **new Firebase project**, add the Android app (`com.flarecare.mobile`), download **`google-services.json`**, place it at **`apps/mobile/google-services.json`**. Details: [`MOBILE_MIGRATION_RUNBOOK.md`](../../MOBILE_MIGRATION_RUNBOOK.md) (Push notifications → Android).

## Implemented feature areas

- Auth: email magic link and Google OAuth bootstrap.
- Core tracking: symptoms, medications (+ tracking insert), hydration, bowel, weight, appointments.
- Reports: mobile summary generation + send via existing report email API.
- Notifications: native permission + daily medication reminder scheduling.
