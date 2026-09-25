# Play Store requirements

**Purpose:** Requirements FlareCare must meet to ship on Google Play and pass review cleanly. Sort these **before** AAB upload — do not wait until rejection.

**Related:** `apps/mobile/DEV_NOTES.md` (HARD RULE — Google Play) · `docs/legal-checklist.md` · `docs/legal-truth-sheet.md` · `.cursor/rules/play-store-positioning.mdc`

**Product stance:** Not a medical / clinical / diagnostic app. Do not advertise as giving medical advice. Personal IBD companion / organiser only. Pass Play review cleanly.

*Checked / noted: 2026-09.*

---

## Critical (required before any Play listing)

### 1. Privacy Policy URL must be live on the public web

Play requires an active, non-geofenced HTTPS privacy page (**not** PDF). In-app Legal text alone is **not** enough for the Console field.

**Current risk (2026-09):**

- `https://flarecare.com` is a **domain-for-sale** page — not FlareCare.
- Default in `apps/mobile/lib/legalUrls.ts` still points at `flarecare.com`.
- `https://flare-care.vercel.app/privacy` returned **404** when checked (page exists in repo: `src/app/privacy/page.js`).

**Action:**

- Own/point a real domain (or fix Vercel routes) so `/privacy` and `/terms` resolve.
- Set Play Console listing privacy URL to that live page.
- Set `EXPO_PUBLIC_LEGAL_BASE_URL` (and keep web deploy in sync).

---

## High (required — will block or bounce review)

### 2. Store listing disclaimer (Google Health policy)

Non–medical-device health apps must say clearly in the **Play description** that the app is **not a medical device** and does **not** diagnose, treat, cure, or prevent any medical condition.

Align short/full description + screenshots with companion/organiser positioning — never “clinical,” “prescribe,” “diagnose.”

### 3. Health apps declaration + Data safety

Complete Play Console → Policy → App content → Health apps form.

Data safety must declare (as applicable):

- **Health info** (symptoms, meds, bowel, weight, etc.)
- **Location** (Find a Toilet)
- Account / personal data

Match the privacy policy. No undeclared SDKs (we don’t ship ads analytics today — keep it that way or update the form if we add any).

### 4. App access for reviewers

If login is required, provide demo credentials (or a working “request access” flow) in Play Console App access. Reviewers must reach core features without emailing Simon.

### 5. Account deletion

We have in-app delete (`delete_user_account`). Play expects a working path + privacy policy that describes it.

**Action:** Smoke-test delete on a throwaway account before review.

---

## Medium (required packaging / forms)

### 6. Location permission

Used for Find a Toilet only. Keep purpose string accurate. Do **not** add background location.

In Data safety + Health declaration, justify location as toilet-finder, not health sensing.

### 7. Target audience / age

Health logging → typically **not** for children. Target 18+ (or Play’s adult band) and stay consistent in the questionnaire. Don’t market to kids.

### 8. Display name

`app.json` name is still **“Flarecare Mobile”** — looks like a WIP. Set the public store name before listing (e.g. Flarecare).

### 9. Exact alarms (`SCHEDULE_EXACT_ALARM`)

Declared for reminders. Be ready to justify (med/appointment reminders) or switch to inexact if Play flags it. Don’t leave unused alarm APIs around.

---

## Don’t ship into review half-baked

### 10. What happens if…

Seek-help / red-flag copy needs **clinical review** before any store build. See `apps/mobile/plans/what-happens-if.md`.

### 11. Trends / Activity framing

Never imply Trends or Activity are clinical scores. Logging counts / adherence helpers only — keep copy honest.

---

## Quick checklist (tick when done)

- [ ] Live `/privacy` + `/terms` on a domain we control
- [ ] Play Console privacy URL points at that page
- [ ] `EXPO_PUBLIC_LEGAL_BASE_URL` (or equivalent) matches
- [ ] Store description includes not-a-medical-device disclaimer
- [ ] Health apps declaration completed
- [ ] Data safety completed and matches app + SDKs
- [ ] Reviewer demo account / App access filled in
- [ ] Account delete smoke-tested
- [ ] Location declared + justified (toilets only)
- [ ] Age / target audience set (adult)
- [ ] Public app display name finalized (not “Flarecare Mobile”)
- [ ] Exact alarm use justified or adjusted
- [ ] No unreviewed seek-help / emergency triage copy in the build

---

## Biggest single action this week

**Get live Privacy + Terms URLs on a domain you control.** Everything else is forms and wording once that’s solid.
