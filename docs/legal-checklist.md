# FlareCare legal & privacy checklist

**Not legal advice.** Use this as a practical roadmap. Your policy text in `src/content/legalDocuments.js` is already strong for an indie health app — a solicitor is **not required** before early launch, but becomes more valuable as the product grows (see below).

**Related docs:** [legal-truth-sheet.md](./legal-truth-sheet.md) · Public pages: `/privacy` · `/terms`

---

## The one-line rule

If you **collect or store health-related data** (symptoms, meds, bowel, weight, etc.), you must be **accurate**, **transparent**, get **clear consent**, and give users **control** (especially delete). Listing third-party services is only part of it.

---

## Layer 1 — Must have before real users (MVP)

### Transparency

- [ ] **Privacy Policy** live at `/privacy` (matches what the app actually does)
- [ ] **Terms of Use** live at `/terms` (includes *not medical advice*, *not for emergencies*)
- [ ] **Data controller** named (e.g. Simon Sutherland / FlareCare) + **support@flarecare.app**
- [ ] Policy says **cloud storage** (Supabase) — not “local-only” unless that’s true
- [ ] Policy lists **why** you process health data (to run the logging service)

### Consent

- [ ] **Explicit consent** at sign-up (checkbox, not pre-ticked) covering Terms + Privacy + health data
- [ ] Consent text is **plain English** (user knows they’re agreeing to health data processing)
- [ ] **Withdraw consent** path documented: delete account + contact email

### Third parties (“services the app uses”)

Listed in privacy policy and honest in app/store forms:

| Service | Used for |
|---------|----------|
| Supabase | Auth, database, hosting |
| Google | Optional OAuth sign-in |
| Email (Supabase Auth) | Sign-in codes |
| Apple / Google (via Expo) | Push notifications if enabled |
| OpenWeatherMap | Dashboard weather (approx. location) |
| Resend | Optional user-initiated emails from web (reports, etc.) |
| Hosting (e.g. Vercel) | Web app |

- [ ] No **ads** or **analytics** in the app unless you add them and update everything below

### Product behaviour

- [ ] **Delete account** works end-to-end (mobile: Help → Delete account)
- [ ] Marketing copy (About, README) does **not** contradict the policy
- [ ] App does **not** present itself as diagnosis / treatment / emergency care

### Mobile + web wiring

- [ ] Web footer links to `/privacy` and `/terms`
- [x] Mobile: **Account → Legal** opens in-app Privacy / Terms (same text as web)
- [ ] Mobile: store listing still needs a **public HTTPS** `/privacy` URL when you deploy web
- [ ] **Deploy web** so production URLs work (not `#` or 404)
- [ ] `EXPO_PUBLIC_WEB_API_BASE_URL` set for dev builds if testing Legal on device

---

## Layer 2 — User rights (GDPR — support in practice)

You don’t need a fancy portal on day one; you need a **process**.

| Right | What to do |
|-------|------------|
| **Access** | Send user their data on request (export or summary via support@flarecare.app) |
| **Correction** | Let them fix profile / logs; help via support if needed |
| **Erasure** | Delete account flow + confirm data removed |
| **Withdraw consent** | Delete account or written request to stop processing |
| **Portability** | Provide machine-readable export if asked (even a JSON dump is OK to start) |
| **Complain** | Tell them they can contact the [ICO](https://ico.org.uk) |

- [ ] Support inbox monitored for privacy requests
- [ ] Internal note: respond within **one month** for most GDPR requests

---

## Layer 3 — Security & data hygiene

- [ ] **HTTPS** everywhere
- [ ] **Auth required** for user data; Supabase **RLS** on tables (verify in Supabase dashboard)
- [ ] **Collect only** fields the app needs
- [ ] **Don’t sell** or share health logs with advertisers / data brokers
- [ ] **Don’t use** health logs for unrelated ML/training without separate, clear consent
- [ ] Secrets in env vars only (never commit `.env`)

---

## Layer 4 — App Store / Play Store

Separate from GDPR but required to publish:

- [ ] **Privacy Policy URL** — must load in browser
- [ ] **Apple App Privacy** / **Google Data safety** — declare types collected (health, email, identifiers, etc.)
- [ ] Declarations **match** the live app and `/privacy` text
- [ ] Terms URL if the store asks for it

---

## Do you need a solicitor right now?

**For FlareCare at your current stage** (bootstrapping, early-stage, consumer app, not selling to clinics/NHS, not making diagnostic claims, handling data roughly as described in the policy): **you do not need to pay a solicitor before launch.**

Your documents are already above the quality of most indie app policies. A solicitor **reviews and signs off** wording — they do **not** replace getting the product right.

### When a solicitor review becomes much more valuable

- [ ] Charging **subscriptions at scale**
- [ ] Handling **large volumes** of health data
- [ ] Working with **clinicians or hospitals**
- [ ] Partnering with **insurers / employers**
- [ ] Expanding **outside the UK** as a focus
- [ ] Adding **AI recommendations** or symptom analysis
- [ ] **Raising investment**
- [ ] Signing **B2B agreements**

If you do pay later, you’ll hand them a solid draft (`legalDocuments.js`) — faster and cheaper than fixing a messy autogenerated policy.

### Operational compliance (usually the real risk now)

The bigger risks are often **implementation**, not the PDF wording:

- [ ] **Account deletion** actually removes DB rows and auth (test web Account + mobile Help → Delete account)
- [ ] **Supabase RLS** — users can only read/write their own data
- [ ] **Backups** — understand provider retention after delete
- [ ] **Secrets / API keys** — only in env vars, never in git
- [ ] **Collect only** what the policy says (no surprise fields or SDKs)
- [ ] **Third-party SDKs** disclosed in the policy (update doc if you add Sentry, analytics, etc.)
- [ ] **Sign-up consent** — checkbox + links to Privacy and Terms (web + mobile)

**A solicitor cannot magically fix weak implementation.**

### Sensible path for your current stage

1. **Use this policy** — keep it in `src/content/legalDocuments.js` (web + mobile share one file)
2. **Keep it accurate** as you port web features to mobile and add new ones
3. **Bump `LEGAL_LAST_UPDATED`** when you change the policy
4. **Add version / consent logging later** (e.g. store `acceptedLegalVersion: '2026-05-19'` on sign-up) — optional but good
5. **Deploy** live `/privacy` and `/terms` before App Store submission
6. **Get legal review later** if the product gains traction or enters regulated / commercial healthcare spaces

---

## Layer 5 — Before a “serious” launch (lawyer + governance)

Do these when you’re shipping widely, charging money, or entering commercial healthcare — **not required for a first indie beta:**

- [ ] **Solicitor review** of `/privacy` and `/terms` (health + apps) — see “When a solicitor review becomes much more valuable” above
- [ ] **ICO registration** — check if you need to pay the data protection fee as a business ([ICO register](https://ico.org.uk/for-organisations/data-protection-fee/register/))
- [ ] **DPIA** (Data Protection Impact Assessment) — often recommended for health monitoring apps
- [ ] **Record of processing** — keep `legal-truth-sheet.md` updated when you add features
- [ ] **Breach plan** — who to contact, how to notify ICO/users if there’s a leak
- [ ] **Processor agreements** — rely on Supabase/hosting DPAs; document in your records

---

## Layer 6 — If you add features later (re-open this list)

Any of these triggers a **policy + consent + store form** update:

- Analytics (Google Analytics, PostHog, etc.)
- Marketing emails
- AI features that send health text to third-party APIs
- Sharing data with clinicians / NHS systems
- Social features (other users see your data)
- Payments / subscriptions
- Children under 16 as target users

---

## FlareCare status snapshot

| Item | Status (as of checklist creation) |
|------|-----------------------------------|
| `/privacy` + `/terms` pages | Done in repo |
| Sign-up consent (web + mobile) | Done |
| Account → Legal | Done |
| Delete account | Done (mobile) |
| `legal-truth-sheet.md` | Done |
| Deploy live URLs | **You** — deploy web |
| Lawyer review | **Optional now** — valuable when scaling (see “Do you need a solicitor”) |
| ICO / DPIA | **You** — when scaling |
| Data export on request | **Process** — support email |

---

## Quick “am I in trouble?” smells

Fix immediately if true:

- Policy says data stays **only on device** but you use **Supabase**
- No way to **delete** account or contact you
- **Pre-ticked** consent or no consent for health data
- App Store says “no health data” but you log symptoms
- You **sell** or **advertise using** health logs

---

## Who to ask for help

| Need | Who |
|------|-----|
| Wording / product fit | Update `src/content/legalDocuments.js` + truth sheet |
| “Is this lawful for my situation?” | UK solicitor (health / tech) |
| ICO registration / DPIA | ICO guidance + solicitor |
| Generator template | OK as **draft** — compare line-by-line to [legal-truth-sheet.md](./legal-truth-sheet.md) |

---

*Last updated: May 2026 — bump this file when the product or stack changes.*
