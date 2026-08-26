# Plan: Collapsing large title headers (native app)

**Status:** ✅ Shipped — documented in **`apps/mobile/README.md`** § Collapsing page titles.

## What we shipped (2026)

**Not** native `headerLargeTitle` (iOS-only). Custom **`CollapsingTitleScrollScreen`** — one title morphs into the nav bar on scroll; iOS + Android.

| Screen | Route | Preset |
|--------|-------|--------|
| What is IBD? | `Ibd` | `titlePreset="informational"` |
| About | `About` | `titlePreset="informational"` |

**Files:**
- `components/CollapsingTitleScrollScreen.tsx`
- `lib/layoutConstants.ts` — `INFORMATIONAL_PAGE_TITLE`, `pageTitle` (22px), `navTitle` (16px), `COLLAPSING_TITLE_CONTENT_GAP` (24px)

**Header:** `headerTitle: ""` for those routes in `App.tsx` `headerOptions`.

---

## Original plan (below) — superseded

## What we mean

**Collapsing large title** (iOS pattern, e.g. Settings → Apple ID):

- At top of scroll: large title sits in the content area below the bar.
- Scroll up: title animates smaller and pins in the navigation header.
- Scroll down: title expands back into the content area.

Flarecare today uses a **fixed** small centered header title (`headerLargeTitleShown: false` in `App.tsx` `headerOptions`). No collapse animation.

## Why consider it

- Familiar on iOS; can feel polished on long scroll screens (Account, sub-screens).
- Home/Dashboard: user prefers **no** fixed “Flarecare” title in header — large title is a different pattern; only add if it still feels clean.

## How (no new library)

Already on `@react-navigation/native-stack`.

1. Per screen (iOS): `headerLargeTitle: true`, set `headerTitle` (e.g. `"Account"`).
2. Screen body: `ScrollView` / `FlatList` with scroll linked to header (`contentInsetAdjustmentBehavior="automatic"` on iOS).
3. Turn off conflicting custom title in scroll content where it duplicates the large title.
4. Android: native stack behaviour differs — decide iOS-only vs custom fallback.

**Effort:** Easy–medium for one screen on iOS; more if Android parity or many screens.

## Suggested scope (when we do it)

| Screen | Notes |
|--------|--------|
| `Account` | Good first candidate; long scroll, matches system Account apps |
| `AccountInfo`, etc. | Optional; may keep small fixed title on push screens |
| `Dashboard` | Only if product wants a large “Home” / greeting — currently header title empty |

## Checklist

- [x] Pick pilot screen — `Ibd`, then `About`.
- [x] Custom cross-platform collapse (not iOS-only native API).
- [x] Typography tokens in `layoutConstants.ts`.
- [ ] Account tab — deferred unless product asks.
- [ ] Document Android behaviour — custom header handles both.

## References

- React Navigation native stack: [Native Stack Navigator](https://reactnavigation.org/docs/native-stack-navigator/#headerlargetitle-ios)
- Code: `apps/mobile/App.tsx` → `headerOptions`, `CollapsingTitleScrollScreen`
