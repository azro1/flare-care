# FlareCare Mobile — dev notes

**For Simon + AI agents.** Implementation conventions and “don’t duplicate this” reminders. Not user-facing docs.

Product overview, env vars, and how to run the app stay in **`README.md`**. Recent polish / changelog-style notes: **`CHANGELOG.md`**.

---

## UI conventions (check before new screens)

Use existing screens as reference — do **not** default to web-style teal hyperlinks.

| Pattern | Reference | Colour / style |
|---------|-----------|----------------|
| **Navigate to another screen** (Account lists, chart link, “View all types”) | `AccountOptionRow` in `App.tsx` | Label **`c.text`**, chevron **`c.textMuted`**, 15px `Inter_400Regular` (medium optional via `labelMedium`) |
| **Inline link in body copy** (e.g. tip “Open chart”) | Hydration **Reset** | **`c.text`** or **`c.textSecondary`** + `textDecorationLine: "underline"` — not `c.primary` |
| **Primary action** (Save, Log now) | `PrimaryButton` | Teal fill — **`c.primary`** |
| **Selected state / type badge / hero feature icon** | Bowel bubbles, dashboard tiles | **`c.primary`** |
| **Form field icons** (calendar, time) | Bowel log sheet | **`c.textSecondary`** — utility, not a CTA |
| **Destructive** | Logout, delete confirm | **`c.destructiveFill`** / `danger` for text |
| **Tips** | Hydration / bowel tip row | Bulb **`#EAB308`** only on the icon; copy **`c.textMuted`** |

**Do not use `c.primary` / `c.link` for tappable text navigation** unless you deliberately want a CTA (e.g. wizard **“Add medication”** in a form — that’s adding data, not leaving the screen).

**New tracker / settings screens:** card layout + `SCREEN_EDGE_PADDING` + `useFlareColors()`; stack routes with `headerOptions` titles; link rows like Account, not a second colour system.

**Live examples:** Account tab (`AccountOptionRow`), **Bowel** (`screens/BowelScreen.tsx`), **Bristol chart** (`screens/BristolGuideScreen.tsx`), **Hydration** (Reset link).

---

## Success & confirm screens (do not duplicate)

**Before building a new full-screen checkmark success or yes/no confirm sheet — use the shared components below.**

| Piece | Use for |
|-------|---------|
| **`SuccessNoticeScreen`** (`components/SuccessNoticeScreen.tsx`) | Full-screen **success** state after something completes — green checkmark, title, message, one **`PrimaryButton`**. Pass `title`, `message`, `buttonTitle`, `onPress`. Use `fullScreen` for root-level screens (logout) with no bottom nav. **Always pass `offsetForBottomTabBar`** when the success screen shows while the bottom tab bar is visible (Dashboard, Reminders, Account tab roots). |
| **`ConfirmModal`** (`components/ConfirmModal.tsx`) | **Confirm/cancel** sheet before an action (logout, delete, etc.) — not a success screen. |

**Do not** copy the checkmark + title + message + button layout into `App.tsx` or a screen file. Extend **`SuccessNoticeScreen`** props only if a new success pattern is genuinely different (e.g. a second button).

**Bottom nav + success:** if `MainBottomTabBar` is on screen, pass `offsetForBottomTabBar` (uses `bottomTabBarHeight()` from `layoutConstants.ts`). Do not re-measure or duplicate the offset.

**Done → navigate:** navigate to Dashboard on Done; **do not** clear success in `useFocusEffect` cleanup (blur) — that flashes the setup screen during the transition. Clear success only when Reminders **gains focus** again (user re-opens the tab).

**Current uses of `SuccessNoticeScreen`:** post-logout (“Sign in”, `fullScreen`), Reminders tab after **Enable notifications** (“Done”, `offsetForBottomTabBar`).

---

## Log history lists (do not duplicate)

**Before adding any grey-tray log list, browse row, or “intro + history” card — use the shared pieces in `components/LogHistoryList.tsx`.** Do **not** create a second list component, row builder, or card wrapper for the same purpose.

| Piece | Use for |
|-------|---------|
| **`LogHistoryList`** | Grey tray rows inside a white card — title + subtitle, optional chevron (`onPressItem`), optional `emptyMessage`, default **`logsPill`** row spacing (matches Dashboard → Logs pill) |
| **`buildTimestampLogRowItem`** | One saved log row — title + `formatLogWhenLine` subtitle from `whenIso` (symptom/medication history, bowel lists) |
| **`buildBrowseLogRowItem`** | Browse row with a custom subtitle (e.g. Dashboard Logs pill: “Symptom logs” / “3 entries”) |
| **`LogHistoryCard`** | White card shell only (`trackerCard` + theme `card` background) |
| **`LogHistoryIntroSection`** | Intro copy + list tray in **one** card (symptom/medication history screens) |
| **`logHistoryCardStyles`** | Shared card/intro/body tokens — import instead of redefining padding/radius/gap |
| **`lib/logDisplay.ts`** | `formatLogWhenLine` (list subtitles), `formatAddedAtHeader` (detail screen headers) — do not reformat timestamps inline |

**Live examples**

- Dashboard → **Logs** tab → History card: `LogHistoryCard` + `buildBrowseLogRowItem` (`App.tsx` → `DashboardScreen`)
- **Symptom history** / **Medication tracking history**: `LogHistoryIntroSection` + `buildTimestampLogRowItem` + `LogHistoryList`
- **Bowel** recent + full log history: `logHistoryCardStyles` + `buildTimestampLogRowItem` (`screens/BowelScreen.tsx`) — list subtitle uses **`created_at`** on the hub **Recent** tray (when the log was saved); **BowelLogs** full history uses **`occurred_at`**; detail screen still shows movement date/time in fields + **Added** header from `created_at`

**Detail screens:** symptom/medication detail = **delete only** in header (no edit). Bowel detail = edit + delete in header.

**When extending:** pass custom `title` / `accessibilityLabel` into the builders; only add props to `LogHistoryList` if the pattern is genuinely new (e.g. a new trailing affordance). Update this file if the shared API changes.

---

## Layout constants

**File:** `lib/layoutConstants.ts`

| Token / helper | Purpose |
|----------------|---------|
| `SCREEN_EDGE_PADDING` | Horizontal inset for screens, cards, headers |
| `TIME_PICKER_MINUTE_INTERVAL` | Native time picker step (5 min) — bowel, meds reminders |
| `bottomTabBarHeight()` | Full rendered height of `MainBottomTabBar` |
| `bottomTabBarScrollInset()` | Scroll padding above tab bar — keep in sync with bar height |

**Bottom bar visible on:** `Dashboard`, `Reminders`, `Account` only (`BOTTOM_BAR_VISIBLE_ROUTES` in `App.tsx`).

---

## Informational pages & collapsing titles

Use when adding pages like **What is IBD?** or **About** — long scroll content **without cards**, with a title that **shrinks into the nav bar** on scroll up and **expands back** on scroll down.

**Live examples:** `IbdScreen`, `AboutScreen`, `LegalDocumentScreen` (Privacy Policy / Terms of Use) in `App.tsx`.  
**Route names:** `Ibd`, `About`, `LegalDocument` (`document`: `privacy` | `terms`).

### What we built (vs normal screens)

| Normal screen (Meds, Settings, …) | Informational page |
|-----------------------------------|--------------------|
| Fixed **16px** title in nav bar (`FLARE_FONT_SIZE.navTitle`) | **One animated title** — no duplicate nav title |
| Often `Card` layout + **18px** section headings (`sectionTitle`) | No cards; body is plain `Text` / lists |
| Default React Navigation header | **Custom header** (see below) while the screen is mounted |
| `ScrollView` + `styles.screen` in the screen | **`CollapsingTitleScrollScreen`** wraps children (provides the scroll view) |

**Not** the iOS-only `headerLargeTitle` API — our own component works on **iOS and Android**.

**Component:** `components/CollapsingTitleScrollScreen.tsx`  
**Tokens:** `lib/layoutConstants.ts`  
**Nav config:** `App.tsx` → `headerOptions`

### Custom header (only on these pages)

When a screen mounts `CollapsingTitleScrollScreen`, it calls `navigation.setOptions({ header: … })` and replaces the default header with **`CollapsingHeader`**:

- Renders **back button** and **overflow menu** from existing `headerOptions` (`headerLeft` / `headerRight`)
- Solid header bar background (theme `screen` colour)
- **`overflow: visible`** so the single `Animated.Text` title can sit below the bar at rest and move up into it without being clipped
- On unmount, header options are reset

Other routes keep the normal stack header. You do **not** add a separate custom header per screen — the wrapper does it.

### Typography — use the right tokens

**Do not** hardcode font sizes on info pages. Use `layoutConstants.ts`:

| Token | Value | When to use |
|-------|-------|-------------|
| `INFORMATIONAL_PAGE_TITLE` | 22px / line 27 | Collapsing **page** title at rest — via `titlePreset="informational"` |
| `FLARE_FONT_SIZE.pageTitle` | 22px | Same (part of `INFORMATIONAL_PAGE_TITLE`) |
| `FLARE_FONT_SIZE.navTitle` | 16px | Title **collapsed** in header (automatic) |
| `FLARE_FONT_SIZE.sectionTitle` | 18px | **In-page** section headings (`dashboardSectionTitleLeft`) — *not* the morphing page title |
| `FLARE_FONT_SIZE.body` | 14px | Body paragraphs (`styles.text`) |
| `FLARE_FONT_FAMILY.bold` | Inter Bold | Page title & section headings |

**At rest:** page title is **22px**, left-aligned under the header.  
**Collapsed:** scales to **16px**, centred in the nav bar.  
**In-page headings** (e.g. “What is FlareCare?”, “Contact”) stay **18px** — same as dashboard section titles.

**Layout tokens** (usually only touch these in `layoutConstants.ts`):

| Token | Value | Purpose |
|-------|-------|---------|
| `COLLAPSING_TITLE_GAP_BELOW_HEADER` | 12px | Space between header bar and large title |
| `COLLAPSING_TITLE_CONTENT_GAP` | 16px | Space below title before body (at rest + scroll clearance) |
| `COLLAPSING_TITLE_SCROLL_DISTANCE` | 80px | Scroll distance for full collapse on **long** pages |
| `SCREEN_EDGE_PADDING` | 12px | Horizontal inset (scroll content aligns with title) |

Short pages (e.g. About): collapse finishes over **however far the page can scroll** — handled inside the component; no extra setup.

### Content layout rules

1. **Left-align** intro and body under the page title (same as **What is IBD?**). Do **not** centre hero text under a left page title.
2. **Do not** animate body text with the title — only the page title moves; content scrolls normally.
3. **Do not** wrap content in an outer `ScrollView` — `CollapsingTitleScrollScreen` is the scroll view.
4. **Do not** add a second page title in JSX — the wrapper renders it.
5. Section headings inside the page use `styles.dashboardSectionTitleLeft` (18px), not `pageTitle`.
6. Footer bits (e.g. version on About) may stay centred if they’re clearly a footer.

### Checklist: add a new informational page

**1. Screen component** (`App.tsx` or extracted file):

```tsx
function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <CollapsingTitleScrollScreen
      title="My Page Title"
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <Text style={[styles.text, { color: c.textMuted }]}>Intro paragraph…</Text>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Section</Text>
      {/* more content */}
    </CollapsingTitleScrollScreen>
  );
}
```

Copy `bottomInset` from `IbdScreen` / `AboutScreen` so content clears the bottom tab bar.

**2. Stack route** — register in `AppStack.Navigator`:

```tsx
<AppStack.Screen name="MyInfo">{() => <MyInfoScreen />}</AppStack.Screen>
```

**3. `headerOptions`** in `App.tsx` — **empty nav title** so it doesn’t duplicate the morphing title:

```tsx
const isMyInfo = route.name === "MyInfo";
// in headerTitle ternary:
: isMyInfo
  ? ""
  : …
```

**4. Navigation** — link from menu / overflow / wherever (e.g. `navigation.navigate("MyInfo")`).

**5. Verify**

- [ ] Title **22px** left-aligned at rest; **16px** centred in header when scrolled up
- [ ] Back + overflow menu visible
- [ ] Body **left-aligned**, no double scroll, no duplicate title
- [ ] Short page: title still reaches header centre at bottom of scroll
- [ ] Spacing under title feels OK (`COLLAPSING_TITLE_CONTENT_GAP` in one place if tuning)

**6. Update this file** — add the screen name to **Live examples** above.

### When *not* to use this

- Card-based screens (Meds, Reminders, Account sub-screens, wizards, …)
- Screens that only need a fixed **16px** nav title
- Anywhere you’d use `styles.screen` + normal `ScrollView` without a morphing title

For those, keep `headerTitle: "…"` in `headerOptions` and **18px** / **16px** tokens as today — no `CollapsingTitleScrollScreen`.

### References

- Original iOS-native plan (superseded): `plans/collapsing-large-title-headers.md`
- Implementation: `components/CollapsingTitleScrollScreen.tsx`, `lib/layoutConstants.ts`, `App.tsx` (`IbdScreen`, `AboutScreen`, `headerOptions`)

---

## Email OTP (implementation)

**UI:** `App.tsx` (`AuthScreen` code step). **Helpers:** `lib/otpAuth.ts`.

| Setting | Where | Default |
|---------|--------|---------|
| OTP expiry | Supabase Dashboard → **Auth → Email → OTP expiry** | 15 min (900s) recommended |
| App mirror | `EXPO_PUBLIC_OTP_EXPIRY_SECONDS` in env | `900` — **must match** Supabase |
| Max resends | `OTP_MAX_RESENDS` in `lib/otpAuth.ts` | `3` |

**Key exports (`lib/otpAuth.ts`):** `OTP_EXPIRY_SECONDS`, `OTP_MAX_RESENDS`, `formatOtpCountdown`, `otpRemainingSeconds`, `isOtpExpired`, `otpVerifyErrorMessage`, `otpResendErrorMessage`.

**Later (optional):** thin `sendOtp` / `verifyOtp` / `resendOtp` abstraction if auth provider changes off Supabase.

---

## My Meds list cache

**File:** `lib/medicationShared.ts` — `getMedicationsListCache`, `setMedicationsListCache`, `invalidateMedicationsListCache`.

Dashboard home load calls `fetchMedicationsForUser` (warms cache). **My Meds** seeds from cache on mount — no list spinner if cache exists. Background refresh on focus still runs. Invalidate on med delete/edit from detail screen; `fetchMedicationsForUser` updates cache after save on My Meds.

---

Separate flows, separate data:

| Feature | Table / route | Icon (`medicationFeatureIcons.ts`) |
|---------|---------------|-------------------------------------|
| **My Meds** (prescribed list + reminders) | `medications` / `Meds` | `MY_MEDS_MCI_ICON` = `pill` |
| **Track Medications** (daily log wizard) | `log_medications` / wizard | `TRACK_MEDICATIONS_MCI_ICON` = `chart-line` |

---

## Keeping these notes useful

When you add shared UI patterns, success flows, log lists, or collapsing-title pages — **update this file**, not the README.

When you change **product positioning** or **user-visible feature list** — update **`README.md`**.

When you ship polish / fixes — **`CHANGELOG.md`**.
