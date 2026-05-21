# FlareCare legal truth sheet (internal)

**Not legal advice.** Use this to keep Privacy Policy and Terms aligned with the product. Review with a UK solicitor before calling documents “final.”

**Checklist:** [legal-checklist.md](./legal-checklist.md) — step-by-step what to do for health data and launch.

## Data controller

| Field | Value |
|-------|--------|
| Service name | FlareCare |
| Operator | Simon Sutherland (FlareCare) |
| Contact | support@flarecare.app |
| Public site | https://flarecare.com (and deployed web app URL) |
| Users | Primarily UK; policy written for UK GDPR |

## What FlareCare does (web = source of truth; mobile being ported)

- **IBD day-to-day tracking:** symptom wizard, medications + tracking, hydration, weight, bowel movements, appointments, dashboard
- **Reports:** date-range summary → view, **Export PDF/CSV**, or **email to clinician** (user enters consultant email — not to self)
- **Appointment Brief:** 2/4/6 weeks or custom range → talking points → copy / download / share / **email to clinician**
- **Reminders:** medication and appointment push (optional)
- **Not:** medical advice, auto-sharing with doctors, selling data

## What we collect

- **Account:** email, display name, account ID, sign-in method (email OTP, Google), session tokens on device
- **Health logs:** symptoms, medications, medication tracking, weight, hydration, bowel movements, appointments, food notes, user preferences
- **Technical:** push notification tokens (if user enables reminders), device-stored app preferences (e.g. appearance)

## Where data is stored

- **Supabase** (cloud database + authentication) — primary store for account and health data
- **User device:** session in secure storage, local notification schedules, cached dashboard snapshot
- **Not sold** and **no third-party analytics** in the app as of this sheet

## Sub-processors / third parties

| Service | Purpose |
|---------|---------|
| Supabase | Auth, database, hosting |
| Google | OAuth sign-in (optional) |
| Email (via Supabase Auth) | OTP / magic link codes |
| Google Firebase / Apple APNs (via Expo) | Push notifications when enabled |
| OpenWeatherMap | Weather on dashboard (approx. location; web may use browser geolocation) |
| Resend | User-initiated **Report** or **Appointment Brief** email to clinician address they type |
| Hosting (e.g. Vercel) | Web app delivery |

## User rights (product)

- **Delete account:** mobile Help → Delete account (`delete_user_account` RPC)
- **Access / correction:** via account screens; contact support@flarecare.app
- **Withdraw consent:** delete account or contact support; notification permission via OS settings

## Documents & URLs

| Document | Path |
|----------|------|
| Privacy Policy | `/privacy` |
| Terms of Use | `/terms` |

Mobile shows legal text **in-app** (shared `src/content/legalDocuments.js`). App Store / Play still need a public HTTPS `/privacy` on the deployed website.

## Copy to keep accurate

- Do **not** claim “local-only” or “data never leaves your device” — cloud sync via Supabase is used.
- State clearly: **not medical advice**, not for emergencies.

## Before App Store / Play launch

1. Lawyer review of `/privacy` and `/terms`
2. Confirm ICO registration need (if trading as business)
3. App Store Connect / Play Console: paste live Privacy URL
4. Test delete-account end-to-end
