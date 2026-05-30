# Mobile — follow-up / known issues

## Next session — screen design + web parity

Design and align flow/functionality with the **web app** for:

- [ ] **Bowel movements**
- [ ] **My weight**
- [ ] **Appointments**

**My Meds** — UI/flow design only; **mark as taken** behaviour is already fixed (was incorrectly tied to Track Medications / `log_medications`; now uses `is_medication_taken` like web). See `CHANGELOG.md` (Unreleased).

Reference: web screens in repo root `src/`; mobile screens in `App.tsx` (`Bowel`, `Weight`, `Appointments`, `Meds`).

---

## Account editing

- [ ] Allow users to edit **full name** and **email** from Account / Information (currently read-only). Name: `supabase.auth.updateUser({ data: { full_name } })`. Email: Supabase email change flow (verification required). UX: edit screens or inline edit, validation, success/error feedback.
- [x] Legal baseline: `/privacy`, `/terms` on web; Account → Legal opens **in-app** docs (not external browser); sign-up consent; `docs/legal-truth-sheet.md`, `docs/legal-checklist.md`. **Before store launch:** deploy web for store Privacy URL; lawyer review.
