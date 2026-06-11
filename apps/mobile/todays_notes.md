# Mobile — follow-up / known issues

## Done (section titles in cards)

- **In-card section titles** — small muted titles back **inside** white cards (not on page background) on Account (`My account`, `Delete account`), symptom/medication wizard review, and log detail screens (symptom, medication log, bowel log, medication profile).
- **Shared layout** — `FlareScreenSectionTitle inCard` + `flareCardSectionStyles.container` / `LogDetailSectionCard` in `LogDetailLayout.tsx`; wizard review uses same via `symptomReviewLayout.tsx`.
- **Title-to-body gap** — `CARD_SECTION_INNER_GAP = 12` in `layoutConstants.ts` (tried 10 → 14 → **12**, locked in).
- **Dev preview** — `Preview review (dev)` on Log Symptoms landing + `symptomReviewPreviewForm.ts` to open review step with sample data (`__DEV__` only; Submit disabled).
- **Notes on detail/review** — `LogDetailNotesTray` (`surfaceSubtle` + body text) instead of bold in-card “Notes” heading.

---

## Next session — screen design + web parity

Design and align flow/functionality with the **web app** for:

- [ ] **Bowel movements**
- [ ] **My weight**
- [ ] **Appointments**

**My Meds** — UI/flow design only; **mark as taken** behaviour is already fixed (was incorrectly tied to Track Medications / `log_medications`; now uses `is_medication_taken` like web). See `CHANGELOG.md` (Unreleased).

Reference: web screens in repo root `src/`; mobile screens in `App.tsx` (`Bowel`, `Weight`, `Appointments`, `Meds`).

---

## Navigation transitions

- [ ] **Smooth screen transitions** — on some screens the push/pop between routes feels jarring (not smooth). Review stack navigator options, animations, and flows where it’s worst (e.g. Bristol chart ↔ bowel, modals vs stack); aim for consistent, native-feeling transitions.

---

## Reminder fired → Recent Activity (future)

When a **medication or appointment** local reminder fires, log it in **Recent Activity** on Home — especially if the user swiped away the banner or missed it.

- [ ] Log **“Reminder fired”** (not “taken” / not “attended”) — e.g. “Reminder: time to take [med name]”
- [ ] **Dedupe** — one entry per med/reminder per day (avoid spam from repeats)
- [ ] Tap row → med detail or Appointments as appropriate
- [ ] **Meds first**; appointments optional v2 if needed
- [ ] Note: may not catch every dismiss when app was killed — log on delivery/tap where OS allows

**Why:** safety net for accidental swipe-away; fits existing Recent Activity pattern.

---

## Account editing

- [ ] Allow users to edit **full name** and **email** from Account / Information (currently read-only). Name: `supabase.auth.updateUser({ data: { full_name } })`. Email: Supabase email change flow (verification required). UX: edit screens or inline edit, validation, success/error feedback.
- [x] Legal baseline: `/privacy`, `/terms` on web; Account → Legal opens **in-app** docs (not external browser); sign-up consent; `docs/legal-truth-sheet.md`, `docs/legal-checklist.md`. **Before store launch:** deploy web for store Privacy URL; lawyer review.
