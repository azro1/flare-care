# Plan: Dashboard pill section redesign

**Status:** Proposed — not started. Branch this work separately from wellbeing / recent-activity changes.

**Context:** Home dashboard currently uses five horizontal pills (`Today's`, `Logs`, `Latest news`, `Info`, `More`) that swap the lower content panel. Default is `More`. Research + product review: this mixes unrelated destinations into one control and fights modern health-app home patterns.

---

## Problem

- Pills act as **secondary navigation** between unrelated content (day status vs browse vs shortcuts), not as views of the same data.
- Five scrolling chips exceed the usual 2–4 sweet spot for segments/tabs.
- Defaulting to **More** hides Today (goals/summary) behind a tap.
- Duplicate chrome (e.g. “Latest news” pill + section title).
- Forced `minHeight` on the pill body is a smell that panels aren’t the same shape.

---

## Direction options (pick one before building)

### Option A — Drop pills, stacked home *(preferred)*

One continuous scroll; no mode switcher:

1. Greeting / weather  
2. Daily Check-in  
3. Recent Activity (2 visible rows, scroll for more)  
4. **Today** — goals + summary always visible  
5. **Shortcuts** — current More grid  
6. Optional: News as a compact strip or “See all”  
7. Info / Logs via Shortcuts (or Account) — not home tabs  

**Why:** Matches Oura / Apple Health / Wellos-style homes; calmer; removes fake second nav.

### Option B — Keep a switcher, related panels only

Reduce to **2–3** peer panels, e.g. `Today · Insights · News`:

- Connected segmented control (not loose scrolling pills)  
- Fixed width, no horizontal scroll  
- Default **Today**  
- Move Logs / Info / More into Shortcuts grid or existing bottom tabs  

**Why:** Closer to Calendar / banking in-screen view switching; keeps density if stacked home feels too long.

### Option C — Shelf modules (no exclusive tabs)

Always on the page, peeking / compact:

- Today: goals rows  
- News: 1–2 cards + See all  
- More: 2×2 tile grid  

Scroll to reveal; no exclusive selection.

---

## Recommended decision

**Ship Option A** unless usability testing shows the home scroll is too long — then fall back to **B** with Today default.

---

## Out of scope for this plan

- Wellbeing wizard / My Wellbeing check-in card (separate work)  
- Recent Activity scroll-clip behaviour (separate / already in progress)  
- Bottom tab bar changes (Home / Reminders / Account stay)

---

## Implementation sketch (when approved)

1. Remove `homeDashTab` state, pill row UI, and `homePillBody` switch.  
2. Render Today + Shortcuts (and optional News shelf) inline under Recent Activity.  
3. Relocate Logs / Info entry points into the Shortcuts grid (or existing screens).  
4. Delete pill-only styles / `HOME_DASHBOARD_CHROME` min-height hacks that only exist for tab swapping.  
5. Smoke-test: Dashboard scroll, Reminders tab, Account, deep links back from history screens that previously restored a pill.

---

## Checklist

- [ ] Confirm Option A / B / C on a new branch  
- [ ] Implement chosen layout  
- [ ] Verify Reminders + Account unaffected  
- [ ] Verify history / guide navigation return paths (no pill restore needed)  
- [ ] Visual pass on short and tall phones  
- [ ] Commit on feature branch  

---

## References (research notes)

- Apple HIG: segmented controls = related subviews; tab bars = top-level sections  
- Design systems: 2–4 segments max; 5+ → tabs, chips-as-filters, or different IA  
- Health apps: surface Today/tasks on home; browse content secondary  
