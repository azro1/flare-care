# Mobile — follow-up / known issues

## Auth & profile
- [ ] Test full auth flows: email OTP, Google, profile setup (`Almost there!`), returning users with/without `full_name`.
- [ ] **Linked accounts / name conflict:** user signs up via email and sets name (e.g. John), later signs in with Google (e.g. Adam). App uses `user_metadata.full_name` first, then `name` — no merge/reconcile logic yet. Confirm Supabase identity linking behaviour and what users should see.
- [ ] Sign-in method label in Account information now shows **OTP** for email (not "Email code").

## Logout UX
- [ ] **Dashboard flash before signed-out screen:** after logout, dashboard sometimes flashes briefly before the "You've been logged out" screen. Investigate session/state ordering on sign-out.
