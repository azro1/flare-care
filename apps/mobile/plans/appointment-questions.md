# Plan: Questions for my appointment

**Status:** Built (v1) — run Supabase SQL in `DEV_NOTES` → Appointment questions, then smoke on device.

**Doc home:** `apps/mobile/plans/`.

---

## Idea

**“What do I actually need to tell my doctor?”**  
**Questions for my appointment**

Not generated medical advice.

Just a place where, during normal life, the user can quickly save things like:

- “Ask about my fatigue.”
- “Ask why I've been getting pain after eating.”
- “Ask whether this medication could be causing…”

---

## The clever part

Capture thoughts **in the moment**, so they show up when the appointment actually happens — instead of blanking in the room or trying to remember three weeks later.

---

## v1 shipped

| Piece | Spec |
|--------|------|
| **Where** | Appointments hub → **Questions** tab (with Appointments · Summary) |
| **Data** | `appointment_questions` (user-authored `body` only) — SQL in `DEV_NOTES.md` |
| **UX** | List + FAB add · tap to edit · long-press multi-delete |
| **Files** | `screens/AppointmentQuestionsPane.tsx`, `lib/appointmentQuestionsShared.ts` |
| **Out of scope** | AI advice, auto-pull into Appointment Brief, mark-as-asked |

---

## Later

- Surface open questions in Appointment Brief / prep.
- Optional “asked” / done state after the visit.
