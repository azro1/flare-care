# Plan: My IBD Card (self-advocacy)

**Status:** Shipped v1 — ⋮ → **My IBD Card**. User-authored only.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer also under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

**In-product name:** **My IBD Card**. Internal table/lib may still use `my_ibd_*`. Framing stays careful: not a medical record / official ID / access card.

---

## Purpose (original brief)

A **personal IBD information card** the person can quickly **show or refer to** with healthcare professionals — especially when they need to communicate their history without having to remember everything.

Grounded in CCUK appointment-prep advice: keep a short personal summary (diagnosis, when diagnosed, medicines, team, key history) for appointments — [Appointment guide](https://www.crohnsandcolitis.org.uk/media/doudiva2/appointment-guide-ed-2-av-without-refs.pdf) / [My appointments journal](https://www.crohnsandcolitis.org.uk/media/pesde2ch/my-appointments-journal-pdf.pdf).

---

## Why it matters

Research around young adults with IBD identifies gaps in:

- knowing their own medical history  
- self-management skills  
- self-advocacy  
- care coordination  
- decision-making  

---

## Shipped v1

- ⋮ menu → **My IBD Card**
- Fields (user-authored, except medications):
  - IBD type
  - Diagnosis date
  - Current medications — first 3 names from My Meds, “+ N more”, View all → My Meds (no dosage; no inset tray)
  - IBD team / service
  - Important history
  - Notes for healthcare professionals
- Per-field morph: Add/edit → leave field or **Save** → saved text + check (tap to edit again)
- Supabase `my_ibd_profiles` (incl. `hcp_notes`)

**Purpose copy:** personal IBD information card to show or refer to with healthcare professionals — so you don’t have to remember everything.

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
