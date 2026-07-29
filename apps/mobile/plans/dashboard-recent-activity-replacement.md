# Plan: Replace Recent Activity on dashboard

**Status:** Proposed — not started. Can ship with or after `dashboard-pill-section-redesign.md`.

**Context:** Dashboard **Recent Activity** lists events from the last ~4 hours (logged symptom, meds, bowel, weight, wellbeing, deletes, goal completions, etc.). Product feel: low value — mostly a receipt of actions the user already knows they did. **Today's Summary** (behind the pills) already surfaces counts.

---

## Problem

- Feed answers *"What did I already do?"* — weak for a health home.
- Overlaps Goals / Summary / Daily Check-in.
- Costs vertical space and implementation surface (event kinds, AsyncStorage helpers, snapshot wiring, scroll-clip UI).
- Does not advance the product promise: log over time → organised picture → reports / care.

---

## Decision (proposed)

**Remove Recent Activity** from the home dashboard.

**Replace** with value-forward home content. Preferred combo:

1. **Today checklist** (still to do today)  
2. **Upcoming card** (appointments + meds ahead — same “look up next” idea as Appointment Summary, on the dashboard)

---

## Replacement options

### Option 1 — Today's checklist *(preferred)*

Always-visible block under Daily Check-in. Rows for today's open/complete state, each tappable:

| Row | Example | Tap → |
|-----|---------|--------|
| Medications | 1/3 taken | Track Medications / meds flow |
| Hydration | 4/8 | Hydration |
| Wellbeing | Not logged / Logged | My Wellbeing |
| Symptoms | Logged / Not logged (optional) | Log Symptoms |

- Reuse existing `todaySummary` (+ wellbeing-for-today query when wired).
- Completed rows show checkmarks; incomplete stay actionable.
- Absorbs the useful part of Goals / Summary so those pill panels can shrink or go away with the pill redesign.

### Option 2 — Upcoming card *(strong second — mirror Appointment Summary)*

Dashboard card whose only job is: **look ahead and tell the user what’s coming**.

Same idea as Appointment Summary today (which already finds the next upcoming appointment for the brief) — but surfaced on **Home**, and broadened beyond appointments:

| Signal | Example copy | Tap → |
|--------|----------------|--------|
| Upcoming appointment(s) | *You have 1 upcoming appointment* + date/time/clinic (or title) | Appointments / that appointment |
| Upcoming meds | *Next dose: [med] at 2:00pm* or *2 medications due today* | Track Medications / Reminders |

**Behaviour**

- Query upcoming appointments (reuse split/upcoming logic from Appointments) and upcoming / due meds (reminders or today’s schedule).
- Show the card when there is **at least one** upcoming item; hide or show a calm empty state when none (prefer hide to avoid noise).
- One card, not a feed — summary line + a little detail, like a glanceable heads-up.
- Does **not** replace Appointment Summary (care-visit brief); that stays for generating/sharing reports. This is the lightweight “what’s next” HUD on the dashboard.

**Why it beats Recent Activity:** forward-looking, not a receipt of past taps — real day-orientation value for IBD patients.

### Option 3 — Care snapshot teaser

One line selling continuity, e.g. *12 days logged this month · Report ready when you need it* → Reports / history.

### Option 4 — Soft insight *(later only)*

Pattern callouts when enough data exists (e.g. sleep/energy vs usual). Do **not** ship empty or noisy insights early.

---

## Explicitly out / do not use as replacement

- Rotating generic tips  
- News feed in this slot  
- Duplicate Daily Check-in tile grid  
- Keeping a truncated activity feed “just in case”

---

## Recommended ship order

1. Remove Recent Activity UI + stop feeding it on the dashboard snapshot path (can leave `recentActivityEvents` helpers until nothing else needs them).  
2. Add **Today checklist** (Option 1) with meds + hydration first; add wellbeing / symptoms when data is easy.  
3. Add **Upcoming card** (Option 2): next appointment detail + upcoming/due meds; reuse appointment upcoming split + med schedule/reminder data.  
4. Optional later: Care teaser (Option 3), soft insights (Option 4).  
5. Coordinate with pill redesign: checklist may replace Goals/Summary under **Today**, making stacked home cleaner.

---

## Implementation sketch

1. Remove Recent Activity section from Dashboard in `App.tsx`.  
2. Drop or gate `setRecentActivity` / snapshot `recentActivity` usage for home (keep event recording only if another surface needs it — likely none).  
3. Build checklist component from `todaySummary` (+ wellbeing today flag).  
4. Build Upcoming card: load next upcoming appointment(s) + upcoming meds; render only when relevant; tap through to Appointments / meds.  
5. Wire presses to existing navigations.  
6. Smoke-test: empty day, partial day, complete day; with/without upcoming appointment; with/without due meds.  
7. Confirm Reminders / Account / Appointment Summary flow / wizards unaffected.

---

## Checklist

- [ ] Confirm Option 1 + Option 2 (Upcoming card) on feature branch  
- [ ] Remove Recent Activity from home  
- [ ] Ship Today checklist (meds + hydration minimum)  
- [ ] Ship Upcoming card (appointments + meds; hide when nothing upcoming)  
- [ ] Decide fate of `recentActivityEvents` / snapshot fields (delete vs keep for future)  
- [ ] Align with pill redesign plan if both land together  
- [ ] Commit on feature branch  

---

## Related

- `apps/mobile/plans/dashboard-pill-section-redesign.md` — home IA; checklist pairs well with Option A (stacked home).
