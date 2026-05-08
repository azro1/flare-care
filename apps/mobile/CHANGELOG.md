# FlareCare mobile changelog

Recent UI and behavior updates on the Expo app (`apps/mobile`).

## Unreleased

### Branding & assets

- Added app mark assets (`fclogo*.png`) and wired splash/auth branding to use the translucent splash variant where appropriate.
- Set primary accent to a clinical teal palette via `MOBILE_BRAND_ACCENT` in `theme.tsx` (single source for CTAs, nav tint, icons).

### Splash & startup

- Reworked JS splash layout: stable centered logo stage, removed `SafeAreaView` splash jump, trimmed extra bottom padding affecting vertical center.
- Hydrate saved appearance (light/dark) before leaving splash so the first auth frame does not flip theme and reflow (`appearanceHydrated` in `theme.tsx`; `SafeAreaProvider` uses `initialWindowMetrics`).
- Auth screen uses explicit `useSafeAreaInsets()` padding instead of `SafeAreaView` + generic screen padding.

### Dashboard

- Weather hero keeps greeting + skeleton row visible while loading to avoid layout shift when metadata arrives.
- Dashboard greeting caches last known first name per user to reduce “there” flashes when session metadata lags.
- OpenWeather raster icons replaced with themed **Ionicons** mapped from OWM icon IDs for consistent tint in light/dark.

### Cards & About

- Card content wrapped in `cardBody` with consistent spacing below titles; **`plain` cards** (auth) omit the wrapper so `flex: 1` form layout still works.
- About contact block spacing; tagline hero padding tweaks.

### Navigation

- Non-dashboard headers use **`chevron-back`** with accessible “Back” label; header left inset adjusted to avoid oversized leading padding.

### Auth

- Light auth “Continue with email” disabled state uses theme primary + opacity instead of hard-coded legacy blue RGBA.

### Account & modals

- Reusable **`ConfirmModal`** with theme tokens including **`modalBackdrop`**; logout flows through confirmation (short title + “Are you sure…” body copy without repeating the product name).

### Dependencies / tooling

- `package-lock.json` and related Expo/mobile dependency updates as applied during sessions.
