# Plan: Collapsing large title headers (native app)

**Status:** Deferred — implement another day.

## What we mean

**Collapsing large title** (iOS pattern, e.g. Settings → Apple ID):

- At top of scroll: large title sits in the content area below the bar.
- Scroll up: title animates smaller and pins in the navigation header.
- Scroll down: title expands back into the content area.

FlareCare today uses a **fixed** small centered header title (`headerLargeTitleShown: false` in `App.tsx` `headerOptions`). No collapse animation.

## Why consider it

- Familiar on iOS; can feel polished on long scroll screens (Account, sub-screens).
- Home/Dashboard: user prefers **no** fixed “FlareCare” title in header — large title is a different pattern; only add if it still feels clean.

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

- [ ] Pick pilot screen (likely Account tab).
- [ ] Enable `headerLargeTitle` in `headerOptions` for that route (Platform.OS === 'ios' if needed).
- [ ] Remove duplicate on-page section title if it clashes with large title.
- [ ] Test scroll + bottom tab bar + overflow menu.
- [ ] Document Android behaviour (accept difference or skip).

## References

- React Navigation native stack: [Native Stack Navigator](https://reactnavigation.org/docs/native-stack-navigator/#headerlargetitle-ios)
- Code: `apps/mobile/App.tsx` → `headerOptions`, `headerLargeTitleShown: false` today
