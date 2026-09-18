# Plan: My IBD (self-advocacy card)

**Status:** Idea — not built. Strong FlareCare concept — **tread carefully**. User-authored only.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer also under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

---

## Why it matters

Research around young adults with IBD identifies gaps in:

- knowing their own medical history  
- self-management skills  
- self-advocacy  
- care coordination  
- decision-making  

That suggests a potentially excellent FlareCare concept: a compact **self-advocacy** screen / card the user can show or review when talking to clinicians, work, or family.

---

## Concept sketch — My IBD

**My IBD**  
Crohn's disease  
Diagnosed: 2019  

**My treatment**  
[their medications]

**My IBD team**  
[their clinician/service]

**My important history**  
[selected key events]

---

## Hard guardrail — legal / safety

**Dangerous territory if we pull medical records automatically.**

- Users **enter (or choose) this information themselves**.  
- Do **not** obtain / import clinical records from NHS / hospitals / GPs / EHR APIs in a way that implies FlareCare holds official medical records.  
- Frame as: **my notes about my IBD** — self-advocacy aid, not a medical record, not medical advice.  
- Avoid copy that sounds like “we fetched your diagnosis from your records.”

Lawsuit / liability risk is real if we over-claim authority or pull records without a proper clinical-product posture (which FlareCare is not).

---

## Product shape (early thoughts)

- Likely Account / Support / Care-adjacent — a personal summary card, not a clinical logger.  
- May later surface selected bits into Appointment Brief / Questions for my appointment — still user-controlled.  
- Can reuse meds the user already tracks in-app (with consent / explicit include), but diagnosis / team / history stay user-authored.

---

## Notes / open

- Fits philosophy: gap between what apps measure and what makes living with IBD hard (advocacy / knowing your own story).  
- Keep scope tiny: one card, not a full PHR.
