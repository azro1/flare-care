# Plan: Find a Toilet (urgency → freedom)

**Status:** Shipped v1 (list) — Home → My tools → Out & About → **Find a Toilet**. Embedded map later.

**Doc home:** `apps/mobile/plans/`. Short backlog pointer also under **Looking ahead** in `DEV_NOTES.md` / `FEATURES.md`.

---

## Why it matters

Competitors (e.g. My IBD Care) often don’t have this. FlareCare is **not** competing on platform size — but a toilet finder is extremely relevant to lived IBD urgency.

**Game changer isn’t “we have toilets on a map.”**  
It’s a really good experience for someone who **suddenly needs a toilet**.

**Technically achievable** for this project — and one of the features worth actually building.

---

## What FlareCare should *not* do

- Don’t try to make the world’s biggest toilet database.  
- Don’t build in-app turn-by-turn navigation — hand off to Google/Apple Maps.  
- **Don’t start by integrating 15 APIs** or building a massive “toilet intelligence” system.

---

## Where it lives (IA + code)

| Layer | Choice |
|--------|--------|
| **Home** | **My tools** tile (not My health / My care; Support is secondary link only) |
| **Screen** | `screens/FindToiletScreen.tsx` |
| **Logic** | `lib/findToiletShared.ts` |
| **Backend** | FlareCare web/API serves toilet data (see portfolio path below) |
| **Wire-up** | `App.tsx` stack + `toolsFeatureTiles` |

Panic UX needs ≤2 taps from Home — don’t bury primary entry under ⋮ Support.

---

## The really interesting bit — usable, not merely nearest

Design around **“usable toilet”** rather than simply **“nearest toilet.”**

If you’re desperate, this is basically useless:

> Nearest toilet: 80m — **Closed**

Whereas this is useful:

> Nearest **open** toilet: 140m — Open now · Free

Rank / surface for **can I use it now**, not pure distance.

---

## The hard part — freshness (not the map)

Toilet data can be **wrong**. That’s the real difficulty of this feature.

OpenStreetMap itself is running a UK project to improve toilet data (opening hours, accessibility, operator, etc.).

**Make FlareCare honest about the data** rather than pretending it’s authoritative.

Example:

> Last checked: 12 Aug 2026  
> Information may have changed.

### Eventually — Report a problem

Simple user contribution (not a full crowdsourcing platform):

- Closed  
- Not accessible  
- Information incorrect  

---

## Data sources

### OpenStreetMap

Toilet-specific tags: location, public/customer access, opening hours, wheelchair, fees, operator, changing facilities, last checked date.

### Great British Public Toilet Map

Open **UK** dataset under **CC BY 4.0** (JSON/CSV). Focused on **publicly accessible** toilets — transport, retail, public buildings, community schemes.

### Other UK open data (bonus)

e.g. **London Assembly** public-toilet open data — legitimate public datasets beyond OSM.

**Do not** invent a FlareCare-owned global toilet DB. Ingest / proxy open datasets; attribute clearly.

---

## Portfolio path (v1 — keep it small)

```
GB Toilet Map GraphQL → FlareCare `/api/toilets/nearby` → list → Directions (Apple/Google Maps)
```

**Shipped v1:** location permission, nearby list (distance + Free / Accessible / etc.), last checked when known, honesty + CC BY attribution, Directions hand-off. Direct Toilet Map GraphQL fallback if `EXPO_PUBLIC_WEB_API_BASE_URL` is unset (local/dev).

**Not in v1:** in-app map, open-now ranking from opening hours, Report a problem.

Then improve the **FlareCare experience** (usable-now ranking, honesty UI, later OSM / London Assembly / Report a problem).

Not: 15 APIs + mega intelligence layer on day one.

---

## Build flow

### 1. Get location

→ user’s location (device permission)

### 2. Query toilet data

Via FlareCare backend (seeded from GB Toilet Map first).

### 3. Show map + list

**🚻 Toilets near you**

- **0.2 mi — Public toilet** — Open · Free  
- **0.3 mi — Community toilet** — Open  
- **0.4 mi — Station toilet** — Open  

Prefer **usable/open** ordering when status is known. Show **last checked** when available.

### 4. Tap one → directions

Hand off to **Google Maps / Apple Maps**.

---

## Attributes (eventually)

Signals — never guarantees:

| | Meaning |
|---|--------|
| 🚻 | Public |
| 🏪 | Customer toilet |
| ♿ | Accessible |
| 🔑 | Key required |
| 💷 | Free |
| 🕐 | Open now |
| 📍 | Distance |
| 🧭 | Directions |

---

## Trust / authority

- Show **source** + **last checked** when known.  
- Copy like: *Information may have changed. Check access with the venue where necessary.*  
- Credit GB Toilet Map (CC BY 4.0), OSM, etc.  
- FlareCare is **not** the authority on whether a toilet is open or accessible.

---

## Related

- Going Out (prep) — this is the in-the-moment escape hatch.  
- IBD at work (urgency at work).  
- Philosophy: make it **ours** (usable-now + honesty), don’t clone a generic loo-map app.
