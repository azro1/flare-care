# Mobile Migration Runbook

Use this as the single source of truth while building and testing mobile.

## Current setup

- Mobile app path: `apps/mobile`
- Mobile platform: Expo React Native
- Backend today:
  - Supabase DB/Auth
  - New Supabase Edge Function: `news`
  - Legacy web API routes still exist (not deleted)

## Environment variables (`apps/mobile/.env`)

Required:

- `EXPO_PUBLIC_SUPABASE_URL=...`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`
- `EXPO_PUBLIC_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1`

Optional fallback (legacy web API):

- `EXPO_PUBLIC_WEB_API_BASE_URL=http://<LAN_IP>:3000`

## Dev commands

From `apps/mobile`:

- Start mobile dev client: `npx expo start --dev-client --lan`

From repo root (only if testing legacy web API fallback):

- Start web server: `npm run dev`

## Push notifications (Android)

### One-time setup

Do this once when onboarding Firebase Cloud Messaging for the Expo/Android dev client:

1. **Create a new Firebase project** in [Firebase Console](https://console.firebase.google.com/) (use a dedicated project for mobile push; avoids collisions with any unrelated Firebase IDs elsewhere).

2. **Register an Android app** in that project:
   - Package name: **`com.flarecare.mobile`** (must match `apps/mobile/app.json` → `android.package`).

3. **Download `google-services.json`** from Firebase (**Project settings → Your apps → Android app**) after registering.

4. **Put the file in the repo** at **`apps/mobile/google-services.json`** (same folder as `app.json`). Expo picks this path via `app.json`:

```json
"android.googleServicesFile": "./google-services.json"
```

5. Confirm **`apps/mobile/app.json`** keeps that `googleServicesFile` entry so EAS/native Android builds load FCM config.

### Build/install dev client

From `apps/mobile`:

- `npx eas build -p android --profile development`

Install build on phone from EAS link.

### Run app on phone

1. Start Metro: `npx expo start --dev-client --lan`
2. Open dev client on phone
3. Use **Scan QR Code** (do not use stale localhost connect links)

## Auth behavior

- Login flow is 2-step:
  1. Email input
  2. 6-digit code verify screen
- Google sign-in is enabled and working with Supabase redirect settings.

## Supabase Auth URL config reminders

Keep web URLs and add mobile redirect used by dev client.
Current working mobile redirect used:

- `exp+flare-care-mobile://expo-development-client`

## New backend function migration

First endpoint migrated:

- Function: `supabase/functions/news/index.ts`

Deploy from repo root:

- First deploy (private default): `npx supabase functions deploy news`
- Public endpoint deploy (required for client-side unauthenticated call):
  - `npx supabase functions deploy news --no-verify-jwt`

Important:
- For this public `news` endpoint, include `--no-verify-jwt` whenever you redeploy this function.

## Why "weather unavailable" happens

Usually one of:

- Function deployed without `--no-verify-jwt` (401)
- Wrong/missing env in `apps/mobile/.env`
- Expo not restarted after env change

## Safe migration rule

- Do not delete existing web routes yet.
- Migrate endpoint-by-endpoint (additive), switch mobile, test, then continue.
