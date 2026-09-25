# Plan: Going Out (under Out & About)

**Status:** Shipped v1 — Home → My tools → Out & About → Going Out. User prep profile + personalised checklist.

**Doc home:** `apps/mobile/plans/`. Umbrella: Out & About (**Find a Toilet** shipped · Travel / etc. later).

---

## Idea

A tiny practical planner for leaving the house — personalised checklist from items the user chose once.

---

## The clever part

**Not** the checklist itself.

The user creates their own **preparation profile once**, rather than another giant IBD checklist shoved in their face.

---

## v1 shipped

| Piece | Choice |
|--------|--------|
| **Umbrella** | Home → **My tools** → **Out & About** hub |
| **Feature** | **Going Out** |
| **Profile items** | Short suggestions (Toilet access · Medication · Spare clothes · Wipes / tissues · Food / drink · Hand sanitiser) + **Add item** for unlimited custom entries (edit/delete). Defaults = all suggestions on. |
| **Storage** | Supabase `going_out_profiles` (one row per user). Legacy AsyncStorage migrated once on load. |
| **Outing UI** | Tickable checklist from profile; Edit prep profile |

Later under Out & About (not decided now): Travel, Work / University, etc. (**Find a Toilet** is shipped — see `find-a-toilet.md`.)

---

## Notes

- Checklist items are **user reminders**, not medical advice.
- Related philosophy: urgency → freedom to go out (`DEV_NOTES` mental model).
