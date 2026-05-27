# Mobile — follow-up / known issues

## Auth & profile
- [ ] Test full auth flows: email OTP, Google, profile setup (`Almost there!`), returning users with/without `full_name`.
- [ ] **Linked accounts / name conflict:** user signs up via email and sets name (e.g. John), later signs in with Google (e.g. Adam). App uses `user_metadata.full_name` first, then `name` — no merge/reconcile logic yet. Confirm Supabase identity linking behaviour and what users should see.
- [ ] Sign-in method label in Account information shows **Email OTP** (done).
- [x] **OTP verification UX** (implemented — verify in app):
  - **Expiry:** 15 minutes (900s) — set Supabase Dashboard → Auth → Email → OTP expiry to match; mirror in app env (e.g. `EXPO_PUBLIC_OTP_EXPIRY_SECONDS=900`).
  - **Timer:** Start on each successful send/resend when user reaches verification step. Store `sentAt` + email; no persist if they leave flow (restart on re-entry).
  - **While time left:** Show countdown only (e.g. `Code expires in 12:34`). No resend link.
  - **When expired:** Hide timer; show active **Resend code** (same email, `signInWithOtp` again → new timer).
  - **Resend limit:** Max **3** resend taps per login attempt (4 OTP emails total incl. first send). Then block with clear copy; suggest wait or different email.
  - **Verify errors:** Map expired/invalid token to friendly message → point to resend.
  - **Alert:** Keep “check your email” alert on first send; timer/resend live on verification page only.
  - **Later:** Thin `sendOtp` / `verifyOtp` / `resendOtp` abstraction if provider changes off Supabase.

## Account editing
- [ ] Allow users to edit **full name** and **email** from Account / Information (currently read-only). Name: `supabase.auth.updateUser({ data: { full_name } })`. Email: Supabase email change flow (verification required). UX: edit screens or inline edit, validation, success/error feedback.
- [x] Legal baseline: `/privacy`, `/terms` on web; Account → Legal opens **in-app** docs (not external browser); sign-up consent; `docs/legal-truth-sheet.md`, `docs/legal-checklist.md`. **Before store launch:** deploy web for store Privacy URL; lawyer review.

## Navigation / headers (later)
- [ ] **Collapsing large title** (iOS-style: big title in content, shrinks into nav bar on scroll) — see `plans/collapsing-large-title-headers.md`. Not in app today (`headerLargeTitleShown: false` everywhere). Candidate screens: Account tab, maybe Home. Dashboard currently has **no** header title (intentional).

## mobile-native polish (dashboard pills + navigation)
- [ ] **Screen transitions feel rough** — especially around today’s home work: pill swaps (Today / Logs / News / More), stack pushes (e.g. Logs → Symptom History), and returning to Dashboard. Improve so moves feel smooth (less flash, consistent animation, pill state vs stack nav). Review after `mobile-native` merge.
