# Flarecare Mobile (native)

**Flarecare** is a **personal health companion for people living with inflammatory bowel disease (IBD)**—especially **Crohn’s disease** and **ulcerative colitis**. The app helps you **track day‑to‑day data** (symptoms, medications, hydration, bowel movements, weight, appointments), **see summaries** on a dashboard, **prepare for clinic visits** (reports / briefs), and **stay on schedule** with reminders—**on your phone**, with a **fixed light or dark** appearance you choose in Account.

**It is not medical advice.** It does not diagnose or treat. Always follow your qualified clinicians.

This folder is the **native mobile app** (Expo / React Native, **iOS + Android**). It is built to align with the **existing web app’s behaviour and APIs** where parity matters.

**Implementation conventions** (shared components, UI patterns, “don’t duplicate this”): **`DEV_NOTES.md`** in this folder — for dev + AI agents.

**Full product feature list** (what the app does, for Simon to remember): **`FEATURES.md`** in this folder.

For **recent UI / polish / changelog-style notes**, see **`CHANGELOG.md`**.

---

## Who it is for

- Adults managing **IBD** who want **simple, consistent tracking** between appointments.
- Anyone already using **Flarecare on the web** who wants the same flows on mobile (auth, data model, and many behaviours are shared).

---

## What the mobile app does (feature areas)

See **`FEATURES.md`** for the full inventory. Short map:

- **Auth:** Email OTP, Google, biometric lock + quick unlock, new-user intro.
- **Dashboard:** Weather, Check in wizards, **Today's priorities**, My health / My tools / My care, **View progress** (meds/hydration + graph).
- **Tracking:** Symptoms, meds list + taken tracking, hydration (cups), bowel, weight, wellbeing.
- **Care:** Appointments + reminders, Appointment Summary (Share/Email), Reports.
- **Supplies:** Short setup → quiet hub → editable Request supplies (Email / Share / Copy; due date advances automatically).
- **Logs hub:** Symptom / medication / wellbeing history.
- **Reminders:** Local med, appointment, and supply-order due notifications.
- **Account:** Theme, app lock, legal, help, about, IBD/nutrition guides.

---

## Stack (high level)

- **Expo** (SDK aligned with `package.json`), **React Native**, **TypeScript**.
- **Supabase** client for auth and data (`EXPO_PUBLIC_*` vars below).
- **Theming:** `theme.tsx` — brand accent, light/dark tokens, navigation theme.
- **Main UI code** today lives largely in **`App.tsx`** (screens, navigation, shared components). Smaller screens live under **`screens/`**.

---

## Email OTP verification (user-facing)

Email sign-in uses a **one-time code** (Supabase OTP). The verification step shows a **live expiry countdown**, controlled **resend** (only after the timer ends), and user-friendly error copy.

| Phase | What the user sees |
|-------|-------------------|
| **Code sent** | Alert to check email; user enters code on verification step |
| **Time remaining** | `Code expires in M:SS` countdown (**Resend** not shown yet) |
| **Expired** | Countdown hidden; **Resend code** enabled (same email, new OTP, timer restarts) |
| **Resend limit** | Max **3** resend taps per attempt (**4** emails total incl. first send); then blocked with clear copy |
| **Wrong / bad code** | One friendly message: check digits and try again; request a new code once the timer ends (Supabase does not reliably split “wrong” vs “expired”) |
| **Leave flow** | Timer state is **not** persisted — restarting sign-in resets the attempt |

**Almost there:** after email sign-in, if the profile has no full name, the same brand lockup as sign-in asks for a name.

Account → Information shows sign-in method as **Email OTP** when applicable. Config and code pointers: **`DEV_NOTES.md` § Email OTP** and **§ Biometric**.

---

## Required environment variables

Set these before running (e.g. `.env` or your shell, depending on how you load Expo env):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_API_BASE_URL` — live: `https://flare-care.vercel.app` (no trailing slash). Phone calls web API routes here (supply email, brief email, etc.). Restart Expo after changes.
- `EXPO_PUBLIC_OTP_EXPIRY_SECONDS` (optional, default `900` — must match Supabase Auth → Email → OTP expiry)

See **`DEV_NOTES.md` → Recurring Medical Supplies → Mobile Email → web** for the short “how email actually works / what broke last time” notes.

---

## Run locally

**This folder (`apps/mobile`) is the native app.** The repository root is the **Next.js web app** (`npm run dev` there). For mobile, work here:

```bash
cd apps/mobile
npm install   # first time only
```

- `npm run start`
- `npm run android`
- `npm run ios`

Use a **development build** (`expo-dev-client`) when you rely on native modules (e.g. notifications) beyond Expo Go.

**Physical device on the same Wi‑Fi (especially Windows):** from **`apps/mobile`**, run:

```bash
npm run start:dev-client:lan
```

That runs a small launcher which sets `REACT_NATIVE_PACKAGER_HOSTNAME` to your PC’s best‑guess LAN IPv4 so the QR / dev URL is not stuck on `127.0.0.1`. If it picks the wrong interface (VPN, Docker, etc.), set `REACT_NATIVE_PACKAGER_HOSTNAME` yourself to the IPv4 from `ipconfig` / `ip addr` before starting. **USB Android:** `adb reverse tcp:8081 tcp:8081` is another way to reach Metro without LAN.

---

## Firebase Android (`google-services.json`)

Mobile push uses **Firebase Cloud Messaging (FCM)** on Android. Short checklist: **`FIREBASE_SETUP.md`** in this folder. Broader migration notes: [`MOBILE_MIGRATION_RUNBOOK.md`](../../MOBILE_MIGRATION_RUNBOOK.md).

---

## Store reality (one codebase, two stores)

**Google Play** and the **Apple App Store** are separate: shipping to Play does **not** publish on iOS. iOS needs its own build, **App Store Connect** submission, and **Apple review**.

---

## Keeping this README useful

When you add a **user-visible feature** or change **product positioning**, update **`FEATURES.md`** (full list) and the short map under **“What the mobile app does”** here.

When you add **implementation patterns** or **“don’t duplicate”** rules, update **`DEV_NOTES.md`**.

When you ship polish / fixes, update **`CHANGELOG.md`**.
