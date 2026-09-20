# Plan: IBD at work (Support resource)

**Status:** Shipped v1 — Support → Practical support → one guide screen (topic list). Not a tracker or employer integration.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer also under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

---

## Idea

**“IBD at work”** — a practical Support resource covering everyday workplace friction, e.g.:

- asking for reasonable adjustments  
- explaining IBD to an employer  
- managing toilet urgency at work  
- fatigue and working  
- appointments during working hours  
- what to do if symptoms suddenly worsen  

---

## Product shape

- Lives in **Support** (educational / practical resources), not Home shelves.  
- Resource / guide content — not a tracker or employer integration.  
- Fits FlareCare philosophy: little problems IBD creates in everyday life (here: the workplace).

---

## v1 shipped

| Piece | Choice |
|--------|--------|
| **Entry** | Support → Practical support → IBD at work |
| **Screen** | Collapsing title + `NumberedAccordion` (same pattern as Nutrition / What is IBD?) |
| **Copy** | `lib/ibdAtWorkCopy.ts` — summary + points + tappable Sources from Crohn’s & Colitis UK, Acas, GOV.UK only |
| **Tone** | Practical; not legal/medical advice; no invented guidance beyond those sources |

---

## Notes / open

- Related ideas: Going Out, Private topics — all Support/life-side, not clinical logging.
- Later: deeper UK links (ACAS / Access to Work) as tappable URLs if useful.
