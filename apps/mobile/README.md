# FlareCare Mobile (native)

**FlareCare** is a **personal health companion for people living with inflammatory bowel disease (IBD)**—especially **Crohn’s disease** and **ulcerative colitis**. The app helps you **track day‑to‑day data** (symptoms, medications, hydration, bowel movements, weight, appointments), **see summaries** on a dashboard, **prepare for clinic visits** (reports / briefs), and **stay on schedule** with reminders—**on your phone**, with a **fixed light or dark** appearance you choose in Account.

**It is not medical advice.** It does not diagnose or treat. Always follow your qualified clinicians.

This folder is the **native mobile app** (Expo / React Native, **iOS + Android**). It is built to align with the **existing web app’s behaviour and APIs** where parity matters; you do **not** need to re‑explain product intent in every new chat if this file stays current.

---

## Who it is for

- Adults managing **IBD** who want **simple, consistent tracking** between appointments.
- Anyone already using **FlareCare on the web** who wants the same flows on mobile (auth, data model, and many behaviours are shared).

---

## What the mobile app does (feature areas)

- **Auth:** Email (OTP / magic link flow in app) and **Google** sign‑in via Supabase.
- **Dashboard:** Home overview, **weather** (via your web API where configured), **news** rail when available, shortcuts into trackers.
- **Core tracking:** Symptoms, medications (including “taken” / tracking inserts), **hydration**, **bowel**, **weight**, **appointments**.
- **Reports & briefs:** Mobile report views and sharing / email using the **existing report email API** from the web backend.
- **Reminders:** Native notification permission and **medication reminder** scheduling (FCM on Android; see Firebase notes below).
- **Account:** Profile / email display, **light / dark** theme, **About** (product + contact), **logout** (with confirmation modal).

For **recent UI / polish / changelog-style notes**, see **`CHANGELOG.md`** in this folder.

---

## Stack (high level)

- **Expo** (SDK aligned with `package.json`), **React Native**, **TypeScript**.
- **Supabase** client for auth and data (`EXPO_PUBLIC_*` vars below).
- **Theming:** `theme.tsx` — brand accent, light/dark tokens, navigation theme; most screens use `useFlareColors()` / `useFlareTheme()`.
- **Main UI code** today lives largely in **`App.tsx`** (screens, navigation, shared components). Splitting into modules is optional future work.

---

## Required environment variables

Set these before running (e.g. `.env` or your shell, depending on how you load Expo env):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_API_BASE_URL` (example: `https://your-web-app.vercel.app`)

The web base URL is used for things like **weather** and **image proxying** where the mobile app calls your deployed web API.

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

When you add a **user-visible feature** or change **product positioning**, update the **“What the mobile app does”** and **“Who it is for”** sections here so the next session (or collaborator) gets context without scrolling old chats.
