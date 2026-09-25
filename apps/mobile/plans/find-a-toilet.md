# Plan: Find a Toilet (urgency → freedom)

**Status:** **Shipped** — My tools → Out & About → Find a Toilet.

**Doc home:** `apps/mobile/plans/`. Also `FEATURES.md` / `CHANGELOG.md` / `DEV_NOTES.md`.

---

## What shipped

- **Map-first Near me** (primary) + **Choose a place** (secondary, UK place search).
- Pull-up sheet (peek → full list), filters, pin name callouts, Directions → Apple/Google Maps.
- Data: Great British Public Toilet Map (CC BY 4.0) via `lib/findToiletShared.ts` (+ optional `/api/toilets/nearby`).
- Attribution on screen. Android Maps key: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (EAS).
- Smooth open: finish navigation slide, then GPS/fetch; remembered near-me paints map on return.

**Files:** `FindToiletScreen.tsx`, `findToiletShared.ts`, `OutAboutScreen.tsx`, `app.config.js`.

## Product rules (keep)

1. Near me is the default — everyday / urgency.
2. Choose a place is for planning (camping, parks, beaches, etc.) — distances from **that place**.
3. No in-app turn-by-turn — hand off to Maps.
4. Do not invent toilet attributes; never claim open/accessible as guaranteed.
5. No disclaimer footers on this screen (app-wide disclaimer later).

## Later (not blocking)

- Usable-now / open-hours ranking
- Report a problem
- Venue photos (Toilet Map GraphQL has **no** image fields — need another licensed source)

## Related

- Going Out (prep) — `plans/going-out.md`
- Philosophy: usable toilet when desperate, not “world’s biggest toilet DB”
