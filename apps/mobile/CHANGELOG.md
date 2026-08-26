# Flarecare mobile changelog

Recent UI and behavior updates on the Expo app (`apps/mobile`).

## Unreleased

### Auth, intro & cleanup (2026-08)

- **Sign-in landing:** brand lockup (logo + Flarecare), email OTP / Google, first-time legal consent; **Almost there** name step matches the same lockup.
- **Biometric:** App lock cover + bank-style fingerprint / Face ID quick unlock after logout (affordance only after OS prompt dismisses; Y aligned with lock screen).
- **New-user intro:** one-shot post-login intro (`NewUserIntroScreen`) replaces per-screen floating welcome cards.
- **Welcome cards removed:** no more `FloatingWelcomeCard` / dashboard getting-started overlays; hubs use **`FLARE_CAPTION_HINT`** where needed (Logs, Appointment Summary).
- **OTP:** isolated countdown; verify error copy is a single honest message (wrong vs expired not distinguishable from Supabase).
- **Docs:** `DEV_NOTES.md` / `README.md` updated for intro, biometrics, captions, OTP.

### Wizards (Log Symptoms & Track Medications)

- **Review hub:** **Edit** on each review section jumps straight to that section; **Back to review** returns without replaying the whole wizard.
- **Track Medications:** blocks **Back to review** / submit when all tracking data was cleared (e.g. **No** on a radio) — alert instead of an empty review screen.
- **Track Medications:** dosage list placeholder **`dose (mg)`** (was example dose in placeholder).
- Wizards no longer show a stack **header back chevron** (use **Previous step** in the wizard footer).

### Log history (symptom & medication tracking)

- History lists use **load more** (teal underlined link) instead of loading everything at once.
- Intro copy moved to a **bulb tip below** the list card; symptom history tip shortened (onset/duration note removed for now).

### UI polish

- **Scroll bars hidden** app-wide.
- **About / What is IBD? / legal docs:** overflow menu (⋮) aligned with other screens; collapsing pages hide scroll indicators.
- **My Meds:** section title **Your medications**; **Mark as taken** / delete-account buttons use subtle borderless styling on white cards.
- Header titles use full **`c.text`** colour (not muted).
- Shared typography tokens for in-card section titles and navigate **Edit** rows (`layoutConstants.ts`).

### Reminders & notifications

- Local medication/appointment reminders on native (no web push subscribe); permission + reschedule on save.
- Push notifications working again on dev client.

### My Meds

- **Mark as taken** fixed: toggles `is_medication_taken` (same as web), not `log_medications` / Track Medications flow. Updates dashboard goals/summary via snapshot invalidation.

### Informational pages

- **Collapsing page title** on **What is IBD?** and **About** (`CollapsingTitleScrollScreen`, `titlePreset="informational"`). Documented in `README.md`.
- About copy: web tagline, “on your device”, IBD audience wording; no “companion”.

### Dashboard

- News pill section title **Latest** (consistent with Goals / History on other pills).

### Branding & assets

- Added app mark assets (`fclogo*.png`) and wired splash/auth branding to use the translucent splash variant where appropriate.
- Set primary accent to a clinical teal palette via `MOBILE_BRAND_ACCENT` in `theme.tsx` (single source for CTAs, nav tint, icons).

### Splash & startup

- Reworked JS splash layout: stable centered logo stage, removed `SafeAreaView` splash jump, trimmed extra bottom padding affecting vertical center.
- Hydrate saved appearance (light/dark) before leaving splash so the first auth frame does not flip theme and reflow (`appearanceHydrated` in `theme.tsx`; `SafeAreaProvider` uses `initialWindowMetrics`).
- Auth screen uses explicit `useSafeAreaInsets()` padding instead of `SafeAreaView` + generic screen padding.

### Dashboard

- Weather hero keeps greeting + skeleton row visible while loading to avoid layout shift when metadata arrives.
- Dashboard greeting caches last known first name per user to reduce “there” flashes when session metadata lags.
- OpenWeather raster icons replaced with themed **Ionicons** mapped from OWM icon IDs for consistent tint in light/dark.

### Cards & About

- Card content wrapped in `cardBody` with consistent spacing below titles; **`plain` cards** (auth) omit the wrapper so `flex: 1` form layout still works.
- About contact block spacing; tagline hero padding tweaks.

### Navigation

- Non-dashboard headers use **`chevron-back`** with accessible “Back” label; header left inset adjusted to avoid oversized leading padding.

### Auth

- Light auth “Continue with email” disabled state uses theme primary + opacity instead of hard-coded legacy blue RGBA.

### Account & modals

- Reusable **`ConfirmModal`** with theme tokens including **`modalBackdrop`**; logout flows through confirmation (short title + “Are you sure…” body copy without repeating the product name).

### Dependencies / tooling

- `package-lock.json` and related Expo/mobile dependency updates as applied during sessions.
