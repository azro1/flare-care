# Plan: Food & Drink log

**Status:** Built — needs Supabase `track_intake` SQL run, then device smoke. Prefer commit on `feat/food-drink-log`.

**Doc home:** Feature plans live in `apps/mobile/plans/`. Do **not** draft plans in `DEV_NOTES.md` (that file is long-lived app reminders only).

---

## Dashboard home (confirmed)

| Shelf | Tiles |
|-------|--------|
| **My health** | Bowel · Hydration · Meds — routine self-tracking |
| **My tools** | Weight · Fluid Output · **Food & Drink** — monitoring / optional clinical logging |
| **My care** | Appointments · Supplies · Reports — clinical / external organisation |

**Why My tools:** Same class as Fluid Output / Weight — optional measure-and-record. Value is a care record when a team asks for intake notes, not “nutrition tracking.”

**Trio (different jobs — keep names clear):**

| Tool | Job |
|------|-----|
| **My Hydration** | How much am I drinking? (cups / target — lifestyle) |
| **Fluid Output** | How much fluid am I losing? (ml out) |
| **Food & Drink** | What did I consume, and when? (diary; drinks may note ml) |

**Separate from Symptoms wizard:** wizard meals = *around this symptom day*. This tool = *daily intake log*. No shared table / auto-copy in v1.

---

## v1 product (effortless)

| Piece | Spec |
|-------|------|
| Name | **Food & Drink** |
| Add flow | Tabs **Food** / **Drink** (tap; fade). FAB prefills Type from active tab. Sheet: when + item (+ required ml for drinks) + optional notes. |
| List | Separate list per tab; chevron rows; detail header **Food** / **Drink**. |
| Out of scope | Calories, macros, barcode, meal slots, reminders, priorities, merging with Hydration cups. |
| Effort | Same rhythm as Fluid Output / Weight. |

**Placement on My tools grid:** Weight + Fluid Output stacked left; **Food & Drink** tall right (two rows). Info hint: *Log what you eat and drink when your care team asks you to. Optional — skip if you don’t need it.*

---

## Data (Supabase)

```sql
create table if not exists public.track_intake (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  kind text not null,              -- 'food' | 'drink'
  body text not null,              -- what (e.g. Sandwich / water)
  amount_ml numeric null,          -- required in app for drink entries
  notes text null,                 -- optional (e.g. only ate half / felt sick)
  created_at timestamptz not null default now()
);
-- indexes + RLS mirror track_output (select/insert/update/delete own)
```

---

## App shape (clone Fluid Output pattern)

| Layer | Files / notes |
|-------|----------------|
| Shared | `lib/intakeShared.ts` — form, validate, cache, CRUD; `TABLES.TRACK_INTAKE` |
| Hub | `screens/IntakeScreen.tsx` — list + FAB + add/edit sheet |
| Detail | `screens/IntakeLogDetailScreen.tsx` — view / edit / delete |
| Nav | `App.tsx` stack + My care tile + titles |
| Docs | `FEATURES.md` + `CHANGELOG.md` when shipped; SQL snippet can land in `DEV_NOTES` only if we need a lasting “how to create the table” reminder (same as Fluid Output) |

**List rows:** title = `body`; trailing = `amount_ml` when set; `whenIso` = `occurred_at`; kind icon/label secondary if needed.

---

## Later (not v1)

- Appointment brief / report snippet
- In-vs-out balance with Fluid Output
- Pull from symptom meals
- Sync drink ml into Hydration

---

## Build order

1. SQL + RLS  
2. Shared lib + caches  
3. Sheet + list hub  
4. Detail  
5. Care tile + FEATURES / CHANGELOG  
6. Smoke on device  
