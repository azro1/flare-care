# Plan: Log Symptoms v2 — IBD-type branching

**Status:** Planned for **version 2** — **not building now**. Research first; then design; then ship.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

**Today (v1):** one shared Log Symptoms wizard for everyone (`SymptomLogWizardScreen` — duration, severity/stress, bathroom frequency, lifestyle, meals, notes).

---

## Why this is a strong idea

Showing the **same** symptom questions to everyone treats Crohn’s, ulcerative colitis, and other IBD as interchangeable. Clinically they are not — and appointment-useful records should reflect that.

**Product shift**

| Today (implicit) | v2 aim |
|------------------|--------|
| “Tell us what’s wrong today.” | “Tell us what’s happening today, in a way that’s useful to you and your IBD team.” |

---

## Clinical / UK grounding (do not freestyle past this)

Research **before** changing questions. Prefer named measures and UK/CCUK/BSG/NICE-aligned sources over inventing a giant questionnaire.

### Treat-to-target PROs differ by disease (STRIDE-II)

[STRIDE-II (IOIBD)](https://www.gastrojournal.org/article/S0016-5085(20)35572-4/fulltext) — short-term clinical targets use **PRO2**, but the items differ:

| Disease | PRO2 symptom pair (STRIDE-II) |
|---------|-------------------------------|
| **Crohn’s disease** | Stool frequency + **abdominal pain** |
| **Ulcerative colitis** | Stool frequency + **rectal bleeding** |

UK practice notes also discuss translating STRIDE-II for CD (e.g. [Crohn’s disease management: translating STRIDE-II for UK clinical practice](https://doi.org/10.1177/17562848241280885)).

**BSG 2025** ([Gut](https://gut.bmj.com/content/74/Suppl_2/s1)): multimodal monitoring — CD often cites clinical indices such as **PRO-2**; UC cites indices such as **partial Mayo** / **SCCAI** — again, not one identical symptom set.

### What CCUK says is useful for appointments

[CCUK Appointment guide](https://www.crohnsandcolitis.org.uk/media/doudiva2/appointment-guide-ed-2-av-without-refs.pdf) / [My appointments journal](https://www.crohnsandcolitis.org.uk/media/pesde2ch/my-appointments-journal-pdf.pdf) — useful summary material includes diagnosis, which parts of the gut are affected, surgeries, current/previous medicines, allergies, recent tests, **symptoms**, triggers, and **what is normal for that person**.

[IBD Standards 2026](https://www.crohnsandcolitis.org.uk/media/duegypns/ibd-standards-2026-ed-1-final.pdf) — ongoing review includes checks of **symptoms** and disease control (not a DIY scorecard).

### Broader symptom domains (validated inventory — map, don’t invent)

[IBD Symptom Inventory (IBDSI)](https://doi.org/10.1093/ibd/izz038) — validated patient-report scale with domains including:

- Bowel symptoms  
- Abdominal discomfort  
- Fatigue  
- Bowel complications  
- Systemic complications  

Use this as a **domain checklist for research mapping**, not as “ship the full 38-item scale in FlareCare” unless licensing, length, and product fit are deliberately decided later.

### Domains the overhaul should *consider* collecting (evidence-backed themes)

Not a final question list — a research agenda:

- Stool frequency  
- Abdominal pain  
- Rectal bleeding  
- Urgency  
- Broader bowel symptoms  
- Fatigue  
- Other systemic symptoms  
- How today compares with the person’s **normal**

**Tailor the actual data collected by branch** — not only the wording.

---

## Proposed product shape (v2)

### Step 1 — What type of IBD do you have?

- Crohn’s disease  
- Ulcerative colitis  
- Other / another type of IBD  
- I’m not sure  

Then the wizard **branches**.

| Branch | Intent |
|--------|--------|
| **Crohn’s** | Questions/data particularly relevant to Crohn’s (e.g. emphasise pain + stool frequency alongside other CD-useful items once researched) |
| **Ulcerative colitis** | UC-specific set (e.g. emphasise stool frequency + rectal bleeding alongside other UC-useful items once researched) |
| **Other** | Common IBD questions + relevant options — no false precision |
| **Not sure** | Common questions **without pretending we know the diagnosis** |

### Persistence / My IBD Card

Prefer **one source of truth** for IBD type where possible:

- User already can store **IBD type** on **My IBD Card** (`my_ibd_profiles.condition`).  
- v2 should decide: pre-fill Step 1 from My IBD Card, write back on change, or ask once and sync — without forcing clinic-grade certainty if they chose “Not sure.”

### Framing (hard)

- User-authored **symptom log** for self and team conversations — **not** a diagnosis tool, **not** a disease-activity score that FlareCare “calculates” as clinical truth unless we deliberately adopt a named, licensed instrument and say so.  
- Do **not** invent red-flag / triage rules in the wizard (see [`what-happens-if.md`](./what-happens-if.md)).  
- Keep **My Wellbeing** vs **Log Symptoms** split (`DEV_NOTES`): LS = symptoms; MW = how IBD affects the person.

---

## Hard rule — research gate before build

**Do not design the branched questions from scratch.**

Before implementation, research and document:

1. **Crohn’s** — what information do IBD clinicians actually want in a symptom update?  
2. **UC** — same.  
3. **Other IBD / IBD-U / indeterminate** — what is appropriate without over-claiming.  
4. Map candidates against: validated PROs (PRO2 / partial Mayo / SCCAI / HBI items as *references*), **ECCO**, **BSG**, **NICE** where relevant, **CCUK**, and IBDSI **domains**.  
5. Decide length: clinic-useful **and** mobile-tolerable (not a 40-step ordeal).  
6. Schema: which new fields; how v1 logs migrate / coexist.

Only then write the step list and copy.

---

## Out of scope for now

- No wizard code changes in current shipping work.  
- No new symptom schema until the research map exists.  
- No claiming FlareCare replaces clinician disease-activity scoring.

---

## Suggested research checklist (pre-v2)

- [ ] STRIDE-II / UK STRIDE translation — confirm PRO2 pairs and what we may safely *mirror as questions* (vs scoring).  
- [ ] BSG 2025 monitoring recommendations (CD vs UC clinical indices).  
- [ ] CCUK appointment / journal “what to bring” → which items belong in **daily LS** vs **My IBD Card** (static history).  
- [ ] IBDSI / other PROMs — domain coverage vs licence / length.  
- [ ] NICE pathways (CD / UC) — any patient-facing monitoring language we should not contradict.  
- [ ] Decide IBD-type storage + sync with My IBD Card.  
- [ ] Draft branch matrices (field × branch: required / optional / hidden).  
- [ ] Simon + clinical review before copy ships.

---

## Related

- Current LS: `SymptomLogWizardScreen` / `lib/symptomWizardShared.ts`  
- [`my-ibd-self-advocacy.md`](./my-ibd-self-advocacy.md) — IBD type / history card  
- [`appointment-questions.md`](./appointment-questions.md) — prep notes, not symptom schema  
- [`what-happens-if.md`](./what-happens-if.md) — escalation (clinically reviewed; separate from LS)
