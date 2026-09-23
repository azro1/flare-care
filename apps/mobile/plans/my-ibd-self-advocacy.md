# Plan: My Card (self-advocacy)

**Status:** Shipped v1 — ⋮ → **My Card**. User-authored only.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer also under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

**In-product name:** **My Card** (not “My IBD Card” — clearer risks of sounding official). Internal table/lib may still use `my_ibd_*`.

---

## Why it matters

Research around young adults with IBD identifies gaps in:

- knowing their own medical history  
- self-management skills  
- self-advocacy  
- care coordination  
- decision-making  

That suggests a FlareCare concept: a compact **self-advocacy** screen / card the user can review when talking to clinicians, work, or family.

---

## Shipped v1

- ⋮ menu → **My Card**
- Fields: Condition · Diagnosed year · My treatment · My IBD team · Important history
- Per-field morph: Add/edit input → **Save** → saved text + check (tap to edit again)
- Supabase `my_ibd_profiles`

**Purpose copy:** a personal card containing information you choose to share.

**Never claim:** official IBD card, proof of IBD, Medical ID, access/priority rights. CCUK notes third-party access cards are not government-issued and don’t guarantee adjustments.

---

## Hard guardrail — legal / safety

**Dangerous territory if we pull medical records automatically.**

- Users **enter this information themselves**.  
- Do **not** obtain / import clinical records from NHS / hospitals / GPs / EHR APIs.  
- Frame as: **my notes** — self-advocacy aid, not a medical record, not medical advice.  
- Avoid copy that sounds like “we fetched your diagnosis from your records.”

---

## Later (not v1)

- Share / PDF / Brief integration (still user-controlled; no access-rights framing)
- Optional include meds from My Meds (explicit toggle only)
