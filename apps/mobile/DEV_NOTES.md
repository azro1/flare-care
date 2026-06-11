# FlareCare Mobile — dev notes

**For Simon + AI agents.** Implementation conventions and “don’t duplicate this” reminders. Not user-facing docs.

Product overview, env vars, and how to run the app stay in **`README.md`**. Recent polish / changelog-style notes: **`CHANGELOG.md`**.

---

## UI conventions (check before new screens)

Use existing screens as reference — do **not** default to web-style teal hyperlinks.

| Pattern | Reference | Colour / style |
|---------|-----------|----------------|
| **Navigate to another screen** (Account lists, chart link, “View all types”) | `AccountOptionRow` in `App.tsx` | Label **`c.text`**, chevron **`c.textMuted`**, `NAV_ROW_LABEL` / `NAV_ROW_CHEVRON_SIZE` from `layoutConstants.ts` (medium optional via `labelMedium`) |
| **Inline link in body copy** (e.g. tip “Open chart”) | Hydration **Reset** | **`c.text`** or **`c.textSecondary`** + `textDecorationLine: "underline"` — not `c.primary` |
| **Primary action** (Save, Log now) | `PrimaryButton` | Teal fill — **`c.primary`** |
| **Secondary on white card** (e.g. Delete account, Mark as taken) | `SecondaryButton` `borderless` + `borderlessFill="surfaceSubtle"` | Subtle fill on **`c.card`** — see `FlareButton.tsx` |
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
| **`LogHistoryIntroSection`** | White list card + **bulb tip below** (not intro copy above the list). Pass `tip` string; children = list only |
| **`LogHistoryTipRow`** | Standalone bulb tip card (`embedded` variant for inside another card, e.g. My Meds) |
| **`LogHistoryPreviewList`** | Paginated grey-tray list + **load more** link (`LogHistoryList` + batch reveal) |
| **`LOG_HISTORY_RECENT_PREVIEW_COUNT`** | Wizard History first paint — **3** rows |
| **`LOG_HISTORY_WIZARD_LOAD_MORE_BATCH`** | Wizard History each **Load more logs** tap — **+3** (same as preview count) |
| **`LOG_HISTORY_LOAD_MORE_BATCH`** | My Meds list, bowel full-history hub — **5** initial / per tap |
| **`usePaginatedLogList`** (`lib/paginatedLogList.ts`) | Fetch + paginate log tables; **`useWizardLogHistory`** wraps symptom/medication history |
| **`logHistoryCardStyles`** | Shared card/intro/body tokens — import instead of redefining padding/radius/gap |
| **`lib/logDisplay.ts`** | `formatLogWhenLine` (list subtitles), `formatAddedAtHeader` (detail screen headers) — do not reformat timestamps inline |

**Live examples**

- Dashboard → **Logs** tab → History card: `LogHistoryCard` + `buildBrowseLogRowItem` (`App.tsx` → `DashboardScreen`)
- **Symptom history** / **Medication tracking history**: `LogHistoryIntroSection` + `LogHistoryPreviewList` + `buildTimestampLogRowItem` + `useWizardLogHistory`
- **Focus refresh:** History screens call **`refresh()`** on focus (not **`resetAndLoad`**) so **Load more** expansion survives detail → back; list still refetches after delete. Same for **Bowel → Your logs** (`BowelLogs`) and **My Meds** (local `visibleMedCount` — do not reset on tab focus).
- **Load more:** teal **`c.primary`**, underlined, **`FLARE_FONT_SIZE.muted`** — via `logHistoryListStyles.loadMoreLabel`; row sits **outside** the grey tray with `CARD_SECTION_INNER_GAP` margin
- **History tips (current copy):** symptom — *“A list of your symptom events recorded through Log Symptoms.”*; medication — *“A list of your medication events recorded through Track Medications.”* — **Onset vs duration** explainer removed from symptom tip for now; find a better home later (not history bulb)
- **Bowel** recent + full log history: `logHistoryCardStyles` + `buildTimestampLogRowItem` (`screens/BowelScreen.tsx`) — list subtitle uses **`created_at`** on the hub **Recent** tray (when the log was saved); **BowelLogs** full history uses **`occurred_at`**; detail screen still shows movement date/time in fields + **Added** header from `created_at`

**Detail screens:** symptom/medication detail = **delete only** in header (no edit). Bowel detail = edit + delete in header.

**When extending:** pass custom `title` / `accessibilityLabel` into the builders; only add props to `LogHistoryList` if the pattern is genuinely new (e.g. a new trailing affordance). Update this file if the shared API changes.

---

## Wizard review — edit from review (do not duplicate)

**Problem this solves:** after reaching **Review**, going back and stepping forward again used to force re-answering every step. **Edit** jumps straight to the section; **Back to review** returns without replaying the full wizard.

**Symptom** (`SymptomLogWizardScreen`) and **Track Medications** (`MedicationTrackingWizardScreen`) use a **review hub**: each review section has **Edit** → jump to that section’s entry step; **Back to review** returns without replaying the whole wizard.

| Piece | Use for |
|-------|---------|
| **`WizardReviewEditButton`** | Edit affordance on review cards — `NAV_ROW_LABEL` + `NAV_ROW_CHEVRON_SIZE`, `c.text` + muted chevron |
| **`LogDetailSectionCard` `onEdit`** | Optional Edit in section title row (`CARD_SECTION_TITLE` + Edit in one row) |
| **`symptomWizardShared`** | `getSymptomReviewEditStep`, `getSymptomReviewSectionLastStep`, `SYMPTOM_WIZARD_REVIEW_STEP` |
| **`medicationWizardShared`** | `getMedicationReviewEditStep`, `getMedicationReviewSectionLastStep`, `MEDICATION_WIZARD_REVIEW_STEP`, `cleanedMedicationHasNoData`, `cleanMedicationForm` |
| **`symptomReviewLayout`** | `WizardReviewSection` / `WizardReviewMedicationSection` — pass `onEdit` from the screen |

**Navigation while editing from review**

- Primary **Back to review**; secondary **Next** only within the same section (multi-step lifestyle / list steps).
- First pass through the wizard stays linear **Next** + **Previous step**.
- **No stack header back chevron** on wizards (`headerOptions` excludes `SymptomLogWizard` / `MedicationTrackingWizard` from `headerLeft`) — conflicts with **Previous step**; hardware back still handled in-screen.

**Empty-data guard (Track Medications)**

If the user clears tracking (e.g. selects **No** on a radio and wipes list data), **Back to review** / advance must not land on an empty review:

- **`returnToReview`** and **`submit`** call `cleanedMedicationHasNoData` → **`Alert.alert`** (“No tracking data entered…”).
- **`medicationWizardTryAdvance`** can return `{ ok: false, noData: true }` → same alert + optional **Back to start** (`resetToLanding`).

Do **not** remove these checks when touching wizard back/next — they block the “empty review” hole.

**Track Medications form copy:** dosage list rows use placeholder **`dose (mg)`** (digits only in field; `normalizeDosage` in shared).

---

## Layout constants

**File:** `lib/layoutConstants.ts`

**Do not hardcode font sizes, spacing insets, or chevron sizes in components** — add or reuse tokens here (`FLARE_FONT_SIZE`, `CARD_SECTION_*`, `NAV_ROW_*`, etc.). Same rule for colours: **`useFlareColors()`**, not one-off hex (except documented exceptions like tip bulb `#EAB308`).

| Token / helper | Purpose |
|----------------|---------|
| `SCREEN_EDGE_PADDING` | Horizontal inset for screens, cards, headers |
| `CARD_SECTION_INNER_GAP` | Gap below in-card section title before body; load-more row margin |
| `CARD_SECTION_TITLE` | In-card section headings — **bold** 14px (`FlareScreenSectionTitle inCard`, wizard review section names) |
| `NAV_ROW_LABEL` | Tappable row label — **regular** 14px (Account rows, wizard **Edit**) |
| `NAV_ROW_CHEVRON_SIZE` | `chevron-forward` size on navigate / Edit rows (16px) |
| `DETAIL_FIELD_LABEL` | Stacked field labels on log detail / review trays |
| `TIME_PICKER_MINUTE_INTERVAL` | Native time picker step (5 min) — bowel, meds reminders |
| `bottomTabBarHeight()` | Full rendered height of `MainBottomTabBar` |
| `bottomTabBarScrollInset()` | Scroll padding above tab bar — keep in sync with bar height |

**Bottom bar visible on:** `Dashboard`, `Reminders`, `Account` only (`BOTTOM_BAR_VISIBLE_ROUTES` in `App.tsx`).

---

## Scroll indicators (app-wide)

**File:** `lib/hideScrollIndicators.ts` — imported from `index.ts` **before** `App`.

Sets default `showsVerticalScrollIndicator={false}` and `showsHorizontalScrollIndicator={false}` on **`ScrollView`** and **`Animated.ScrollView`**. Do not re-enable scroll bars on individual screens unless there is a deliberate exception.

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
- **Must apply** `headerLeftContainerStyle` / `headerRightContainerStyle` from options (e.g. `paddingRight: SCREEN_EDGE_PADDING`) so ⋮ aligns with Help / Account — the custom header does not get stack padding automatically
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
