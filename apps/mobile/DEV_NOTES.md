# FlareCare Mobile — dev notes

**For Simon + AI agents.** Implementation conventions and “don’t duplicate this” reminders. Not user-facing docs.

Product overview, env vars, and how to run the app stay in **`README.md`**. Recent polish / changelog-style notes: **`CHANGELOG.md`**.

---

## Known-good checkpoints (rollback)

If reminders / welcome cards / related mobile UX regress while we keep building, start from this commit before deep debugging:

| When verified | Commit | Summary |
|---------------|--------|---------|
| **2026-07-23** (working in daily use since 2026-07-06) | **`413eca9`** (`413eca9d2a9eb3f4b607053738665b301d3de9a9`) | **`fix(mobile): med reminders, welcome card overlay, and Reminders UX`** |

**What was solid at `413eca9`:**
- Local medication + appointment reminders scheduling / firing after phone-settings permission
- Reminders tab UX (setup copy, auto-refresh on return from settings, no wrong-state flash)
- Welcome card transparent overlay + updated My Meds / Appointments reminder copy
- Confirm modal / delete-account card spacing polish

**Restore check:** `git show 413eca9` or `git checkout 413eca9` (detached) / create a branch from it if you need to compare.

---

## UI conventions (check before new screens)

Use existing screens as reference — do **not** default to web-style teal hyperlinks.

| Pattern | Reference | Colour / style |
|---------|-----------|----------------|
| **Navigate to another screen** (Account lists, chart link, “View all types”) | `LogHistoryList` + `onPressItem` in `LogHistoryCard` | Label **`c.text`**, chevron on browse rows — Account uses `rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}` |
| **Inline link in body copy** (e.g. tip “Open chart”) | Hydration **Reset** | **`c.text`** or **`c.textSecondary`** + `textDecorationLine: "underline"` — not `c.primary` |
| **Primary action** (Save, Log now) | `PrimaryButton` | Teal fill — **`c.primary`** |
| **Secondary on white card** (e.g. Mark as taken) | `SecondaryButton` `borderless` + `borderlessFill="surfaceSubtle"` | Subtle fill, no border — see `FlareButton.tsx` |
| **Secondary bordered** (e.g. Delete account on Account tab) | `SecondaryButton` (default) | Border **`c.secondaryBtnBorder`**, fill **`c.secondaryBtnBg`** |
| **Selected state / type badge / hero feature icon** | Bowel bubbles, dashboard tiles | **`c.primary`** |
| **Form field icons** (calendar, time) | Bowel log sheet | **`c.textSecondary`** — utility, not a CTA |
| **Destructive** | Logout, delete confirm | **`c.destructiveFill`** / `danger` for text |

**Do not use `c.primary` / `c.link` for tappable text navigation** unless you deliberately want a CTA (e.g. wizard **“Add medication”** in a form — that’s adding data, not leaving the screen).

**New tracker / settings screens:** card layout + `SCREEN_EDGE_PADDING` + `useFlareColors()`; stack routes with `headerOptions` titles; link rows like Account, not a second colour system.

**Header chrome (list screens):** **⋮** overflow — **`c.text`** in light, **`c.textMuted`** in dark. Tracker hubs (Bowel, My Meds, Weight, Appointments) use a **thumb-reach + FAB** (`TrackerThumbFab`) instead of header **+**.

**Live examples:** Account tab (`LogHistoryList` link rows), **Bowel** / **My Meds** (`TrackerThumbFab`), **Bristol chart** (`screens/BristolGuideScreen.tsx`), **Hydration** (Reset link).

---

## Light / dark theme (`theme.tsx`)

**Light mode — grouped layout** (iOS-style gray canvas + white panels). **Dark mode** still uses Expo styleguide tokens; do not change dark paths when tuning light.

| Token | Light | Role |
|-------|-------|------|
| `c.screen` | `#F4F4F4` (`LIGHT_GROUPED_SCREEN_BG` in `theme.tsx`) | Page scaffold, nav bar, tab bar |
| `c.card` | `#FFFFFF` (`LIGHT_GROUPED_CARD_BG`) | Cards, dashboard tiles, modals |
| `c.surfaceSubtle` | **same as `screen`** | In-card grey trays / inset lists — reads on white `card` |

**Single source:** edit `LIGHT_GROUPED_SCREEN_BG` / `LIGHT_GROUPED_CARD_BG` in **`theme.tsx` only** — `mapTokens()` wires `surfaceSubtle`, `newsImageBg`, `reportBg`, and `appearanceChipInactiveBg` from `screen` in light mode. **Do not** hardcode the gray in screen files.

**Auth / session transitions (do not regress)**

| Moment | Pattern in `App.tsx` | Why |
|--------|----------------------|-----|
| **After login → Dashboard** | **`AppEntryShell`** — solid `c.screen` blocker until `AppTabs` fires `onAppShellReady` (`onNavigationReady` + `requestAnimationFrame`). Dashboard route uses `animation: 'none'`. | Stops the home screen “dropping in” / sliding down when the stack first mounts. |
| **After logout → signed-out success** | **`signOutShell`** + **`signOutOverlay`** — `SuccessNoticeScreen` overlays the app; `AppTabs` may stay mounted until `finishSignOut` clears `user`. | Avoids tearing down `NavigationContainer` in one frame (flash / slide). |

**Logout success layout:** `SuccessNoticeScreen` `fullScreen` — stable `initialWindowMetrics` safe area + wizard step-0 landing slot (`WIZARD_LANDING_BELOW_SAFE_TOP`, `wizardLandingMinHeight()` in `layoutConstants.ts`). **Do not** use `ScrollView`, `useWindowDimensions`, or animated `SafeAreaView` edges on logout — those caused vertical jump.

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

**Current uses of `SuccessNoticeScreen`:** post-logout (“Sign in”, `fullScreen` + overlay shell in `App.tsx`), Reminders tab after **Enable notifications** (“Done”, `offsetForBottomTabBar`).

**Logout:** content vertically aligned with wizard step-0 landing; transition smoothness depends on overlay shell + stable layout above — see **Auth / session transitions** under **Light / dark theme**.

---

## First-time instruction cards (do not duplicate)

**Direction:** small dismissible welcome cards on key screens to orient **new accounts** — not returning users. Former lightbulb tips are retired; copy lives in **`lib/instructionCardCopy.ts`** and shows once until **X** dismiss.

| Piece | Use for |
|-------|---------|
| **`DashboardWelcomeCard`** (`components/DashboardWelcomeCard.tsx`) | Floating instruction card — copy + **X** dismiss. Reuse the shell for future per-page tips (pass different message props when we generalise). |
| **`lib/instructionCardCopy.ts`** | Shared instruction card title + paragraphs — **`DASHBOARD_GETTING_STARTED_INSTRUCTION`**, **`REPORTS_INSTRUCTION`** (Reports page, not wired yet). |
| **`lib/dashboardWelcome.ts`** | Per-user **eligible** + **dismissed** flags in AsyncStorage. **`isNewAuthUser`** + **`markDashboardWelcomeEligible`** on sign-up only (`AuthScreen` email OTP / Google). |
| **`App.tsx` → `DashboardScreen`** | Renders card in **`dashboardWelcomeFloat`** — `position: absolute` at top of dashboard content (not nav header); scroll runs underneath; no reserved spacer above weather card. |

**Show when:** `welcomeEligible && !welcomeDismissed` (hydrated from storage). **Never** for existing accounts logging in — eligibility is set only at account creation.

**Dismiss:** X → **`markDashboardWelcomeDismissed(userId)`** — do not show again unless they delete the account and sign up fresh (new user id).

**Current dashboard copy:** **`DASHBOARD_GETTING_STARTED_INSTRUCTION`** in `lib/instructionCardCopy.ts`. Reports copy saved as **`REPORTS_INSTRUCTION`** (same file) for when the Reports instruction card is built.

**Visual (instruction cards):** cadet **left accent bar** + **primary border** + stronger shadow; **compass** icon in `surfaceSubtle` circle; bold **section title** (`c.text`); body **`c.textSecondary`** — layout tokens **`INSTRUCTION_CARD_*`** in `layoutConstants.ts`; colours via **`useFlareColors()`**. Generalise this shell when adding tips on other screens.

**When adding another page:** new eligible key or generalised tip id in storage; same float pattern; one short paragraph; dismiss once per account per tip.

**Dim scrim (`InstructionCardOverlay` + `InstructionScreenShell`):** soft dim via **`instructionScrim`** rgba. **Convention:** scroll stays usable; lists, links, primary buttons, and thumb FAB stay **visible** but blocked until **X** dismiss (`InstructionInteractionBlock`). Exception: Hydration **Daily Intake Guidelines** still uses **`interactiveWhileInstruction`** until aligned with dashboard.

| Do | Don't |
|----|-------|
| Keep scroll content mounted; block taps with **`InstructionInteractionBlock`** | Hide page content when instruction shows |
| Block help links and FAB until dismiss (default) | Allow CTAs through the dim layer |

---

## Log history lists (do not duplicate)

All shared list UI lives in **`components/LogHistoryList.tsx`**. Do **not** hand-roll tray rows or duplicate card wrappers.

### Quick pick — what to use

**Visual pattern:** white **`LogHistoryCard`** → **inset tray** (`surfaceSubtle` — the darker/lighter panel behind rows) → **rows**.

| You are building… | Use |
|-----------------|-----|
| **Navigate / browse rows** (chevron, 1 or 2 lines) — Account links, appointment presets, summary nav, legal links | **`LogHistoryCard`** + **`LogHistoryList`** + `onPressItem`. Items: plain `{ id, title }` or **`buildBrowseLogRowItem`** when you need a subtitle. |
| **Saved log history** (title + date, tap → detail) | **`LogHistoryPreviewList`** (or **`LogHistoryList`**) + **`buildTimestampLogRowItem`**. Paginated: **`usePaginatedLogList`** / **`useWizardLogHistory`**. |
| **Read-only counts** (title on left, number on right) — Today → Summary | **`LogHistoryList`** + `trailingText` on each item. |
| **History hub** (list card only) | **`LogHistoryCard`** + list — first-time copy in welcome card (`InstructionScreenShell`). |
| **Read-only label + value fields** (not tappable rows) — Account info, brief detail screens | **`LogDetailFieldGroup`** in **`LogDetailCard`** — **not** `LogHistoryList`. |

**Default rule:** if it’s a **row list on the inset tray**, use **`LogHistoryList`** (1-line and 2-line rows both). Row height and chevron alignment are automatic — **never** copy `minHeight` / spacer logic into a screen. Use `renderLeading` / `getRowStyle` / `multilineTitle` / `renderTrailing={() => null}` when the row shape differs (Bristol chart, talking points).

| Piece | Use for |
|-------|---------|
| **`LogHistoryList`** | Inset-tray row list — see **Quick pick** and **Row shapes** below. |
| **`buildTimestampLogRowItem`** | One saved log row — title + `formatLogWhenLine` subtitle from `whenIso` |
| **`buildBrowseLogRowItem`** | Browse row — `title` + optional `subtitle` (instruction line or entry count). Title-only: pass `""` or omit — height is automatic. |
| **`LogHistoryCard`** | White card shell only (`trackerCard` + theme `card` background) |
| **`LogHistoryPreviewList`** | Paginated grey-tray list + **load more** link (`LogHistoryList` + batch reveal) |
| **`LOG_HISTORY_RECENT_PREVIEW_COUNT`** | Wizard History first paint — **3** rows |
| **`LOG_HISTORY_WIZARD_LOAD_MORE_BATCH`** | Wizard History each **Load more logs** tap — **+3** (same as preview count) |
| **`LOG_HISTORY_LOAD_MORE_BATCH`** | My Meds list, bowel full-history hub — **5** initial / per tap |
| **`usePaginatedLogList`** (`lib/paginatedLogList.ts`) | Fetch + paginate log tables; **`resolvePaginatedVisibleCount`**, **`syncExpandedFromCache`**; optional **`cache`** for rows + expansion |
| **`useWizardLogHistory`** (`lib/wizardLogHistory.ts`) | Symptom / Track Medications history — preview **3**, +**3** per load-more; per-table cache |
| **`useMedicationsList`** (`lib/useMedicationsList.ts`) | My Meds fetch + focus refresh; list rows cached in **`medicationShared`** |
| **`logHistoryCardStyles`** | Shared card/intro/body tokens — import instead of redefining padding/radius/gap |
| **`lib/logDisplay.ts`** | `formatLogWhenLine` (list subtitles — short year), `formatAddedAtHeader` (detail screen headers) — do not reformat timestamps inline |
| **`lib/formatUkDate.ts`** | `formatUkDate` (detail/forms), `formatUkDateShort` (list tray subtitles only) |
| **`lib/listExpansionNavigation.ts`** | Root **`onStateChange`** — collapse load-more when leaving a feature section (see below) |

**Load more — expansion survives detail ↔ back, resets when leaving the section**

| Section | Stack routes | Initial visible | Reset / persist |
|---------|--------------|-----------------|-----------------|
| Bowel | `Bowel`, `BowelLogDetail`, `BristolGuide` | **5** | `bowelMovementShared` list cache `visibleCount` |
| My Meds | `Meds`, `MedicationDetail` | **5** | `getMedsListExpandedCount` / `setMedsListExpandedCount` |
| Symptom history | `SymptomHistory`, `SymptomDetail` | **3** | `useWizardLogHistory` + `resetWizardLogHistoryExpansion` |
| Med tracking history | `MedicationTrackingHistory`, `MedicationLogDetail` | **3** | same, table `log_medications` |

- Wire **`handleListExpansionNavigationRouteChange(userId, routeName)`** from **`NavigationContainer` `onStateChange`** (`App.tsx`). **Do not** use screen **`blur`** to detect leave — back/pop reports the wrong active route.
- On list focus: **`syncExpandedFromCache()`** then **`refresh()`** (paginated lists) or **`getMedsListExpandedCount`** + **`useFocusEffect`** (My Meds).
- Derive visible row count **during render** (`useMemo` / `resolvePaginatedVisibleCount`) so **load more** does not flash one frame after add/save.
- Under the preview cap (≤5 bowel/meds, ≤3 wizard history), show **all** rows — no load-more link.

**Live examples**

- Dashboard → **Logs** tab → History card: `LogHistoryCard` + `buildBrowseLogRowItem` (`App.tsx` → `DashboardScreen`)
- **Account** → My account / legal links: `LogHistoryList` + title-only items + `onPressItem` (`App.tsx` → `AccountScreen`, `LegalLinksScreen`)
- **Appointment summary** period picker + result nav: `LogHistoryCard` + `LogHistoryList` + `buildBrowseLogRowItem` (`AppointmentBriefScreen`, `AppointmentBriefResultScreen`)
- **Symptom history** / **Medication tracking history**: `LogHistoryCard` + `LogHistoryPreviewList` + `buildTimestampLogRowItem` + `useWizardLogHistory` + welcome card copy in `instructionCardCopy.ts`
- **Focus refresh:** **`syncExpandedFromCache()`** + **`refresh()`** on focus (not **`resetAndLoad`**) — refetches data; expansion reset only when navigation leaves the section (table above).
- **Load more:** teal **`c.primary`**, underlined, **`FLARE_FONT_SIZE.muted`** — via `logHistoryListStyles.loadMoreLabel`; row sits **outside** the grey tray with `CARD_SECTION_INNER_GAP` margin
- **Bowel** / **My Meds** (`screens/BowelScreen.tsx`, `screens/MedicationsScreen.tsx`): list-first — icon + **Nothing here yet** when empty; welcome card on first visit; **thumb-reach + FAB** (`TrackerThumbFab`). My Meds passes `tabBarClearance={bottomTabBarHeight(...)}`. Bowel list subtitle = **`created_at`**; detail fields use **`occurred_at`** + **Added** header from `created_at`. **Weight** / **Appointments** — same FAB pattern.
- **Bristol chart** (`screens/BristolGuideScreen.tsx`): **exception** — manual tray; see table above.

### Row shapes (`LogHistoryList` handles all of these)

| Shape | Example | What you pass |
|-------|---------|---------------|
| **1-line navigate** | Account → Privacy Policy; appointment preset | `{ id, title }` + `onPressItem` — auto min-height + title centred with chevron |
| **2-line navigate** | Custom date range; summary → Health overview | `buildBrowseLogRowItem({ title, subtitle })` + `onPressItem` |
| **2-line log history** | Bowel / symptom list row | `buildTimestampLogRowItem` or `whenIso` / `subtitle` |
| **1-line + trailing value** | Today → Summary counts | `trailingText` — same row height as two-line rows |
| **2-line status** | Today → Goals “Complete” / “Active” | `subtitle` + optional `completed` |

Do **not** copy `minHeight` or invisible spacers into screens — extend **`LogHistoryList`** if you need a new shape (then update this section).

**Detail screens:** symptom/medication log detail = **delete only** in header (no edit). **Bowel log** / **medication profile** = edit + delete. Bowel + medication profile detail cards use **`LogDetailCard`** + field tray only — **no** in-card **Details** section title (unlike multi-section symptom detail).

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

**Do not hardcode font sizes, spacing insets, or chevron sizes in components** — add or reuse tokens here (`FLARE_FONT_SIZE`, `CARD_SECTION_*`, `NAV_ROW_*`, etc.). Same rule for colours: **`useFlareColors()`**, not one-off hex.

| Token / helper | Purpose |
|----------------|---------|
| `SCREEN_EDGE_PADDING` | Horizontal inset for screens, cards, headers |
| `CARD_SECTION_INNER_GAP` | Gap below in-card section title before body; load-more row margin |
| `CARD_SECTION_TITLE` | In-card section headings — **bold** 14px (`FlareScreenSectionTitle inCard`, wizard review section names) |
| `INSTRUCTION_CARD_*` | Floating instruction cards — padding, radius, gaps, title/body typography (`DashboardWelcomeCard`, future per-screen tips) |
| `NAV_ROW_LABEL` | Tappable row label — **regular** 14px (Account rows, wizard **Edit**) |
| `NAV_ROW_CHEVRON_SIZE` | `chevron-forward` size on navigate / Edit rows (16px) |
| `DETAIL_FIELD_LABEL` | Stacked field labels on log detail / review trays |
| `TIME_PICKER_MINUTE_INTERVAL` | Native time picker step (5 min) — bowel, meds reminders |
| `bottomTabBarHeight()` | Full rendered height of `MainBottomTabBar` |
| `bottomTabBarScrollInset()` | Scroll padding above tab bar — keep in sync with bar height |
| `TRACKER_THUMB_FAB_SIZE` / `trackerThumbFabBottom()` / `trackerThumbFabInsetRight()` / `trackerThumbFabScrollPadding()` | Thumb-reach + on tracker hubs — `components/TrackerThumbFab.tsx` |
| `wizardLandingMinHeight()` | Wizard step-0 landing block height — logout `fullScreen` success uses same slot |
| `WIZARD_LANDING_BELOW_SAFE_TOP` | Simulated stack header + scroll top pad for full-screen success align |

**Bottom bar visible on:** `Dashboard`, `Reminders`, `Account`, `Meds`, `Appointments` (`BOTTOM_BAR_VISIBLE_ROUTES` in `App.tsx`). Pass `tabBarClearance={bottomTabBarHeight(insets.bottom)}` to `TrackerThumbFab` on those routes.

---

## Scroll indicators (app-wide)

**Files:** `lib/hideScrollIndicators.ts` (startup defaults + shared props) and `lib/scrollViews.tsx` (`ScrollView` / `AnimatedScrollView` wrappers). Import wrappers instead of `react-native` scroll views. `hideScrollIndicators.ts` is imported from `index.ts` **before** `App`.

Hides vertical and horizontal scroll indicators app-wide. Do not re-enable scroll bars on individual screens unless there is a deliberate exception.

---

## Informational pages & collapsing titles

Use when adding pages like **What is IBD?**, **Nutrition guide**, or **About** — long scroll content **without cards**, with a title that **shrinks into the nav bar** on scroll up and **expands back** on scroll down.

**Live examples:** `IbdScreen`, `NutritionGuideScreen`, `AboutScreen`, `LegalDocumentScreen` (Privacy Policy / Terms of Use) in `App.tsx`.  
**Route names:** `Ibd`, `NutritionGuide`, `About`, `LegalDocument` (`document`: `privacy` | `terms`).

**Guides hub (Home):** dashboard pill **Guides** (Today's → Logs → Latest → Guides → More) lists Account-style rows for **What is IBD?** and **Nutrition guide**. IBD is **not** in the header overflow ⋮ — overflow keeps Settings / Help / About.

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

## Dashboard home — seed data cards (no layout jump)

**Problem:** Home cards that show/hide or change height from fetched data (greeting weather, Coming up, today counts, news) will **jump** when the user adds/deletes elsewhere and returns — if UI waits for the focus refetch before updating.

**Pattern (do this for any new dashboard card that displays live data):**

1. **Keep an in-memory seed** in `lib/dashboardSnapshotCache.ts` (`DashboardSnapshot` + `dashboardSnapshotByUserId`).
2. **`useState(() => snapshotSeed?.… ?? fallback)`** so remounts don’t flash empty → filled.
3. On **`useFocusEffect`**, apply the seed **synchronously** before the async load (greeting weather, Coming up from list caches).
4. After fetch, write results back into the snapshot **and** `setState`.
5. On mutate (add/edit/delete), call **`invalidateDashboardSnapshot(userId)`** and keep domain list caches warm (`fetchXForUser` / `setXListCache` after save) so the next focus can seed correctly.

| Card / block | Seed source | Files |
|--------------|-------------|--------|
| **Greeting / weather** | `DashboardSnapshot.weatherMeta` / `weather` | `App.tsx` `DashboardScreen`, `dashboardSnapshotCache.ts` |
| **Today counts** | `DashboardSnapshot.todaySummary` | same |
| **News shelf** | `DashboardSnapshot.newsItems` / `newsError` (skip loading flash if cache has items) | same + `newsShared.ts` |
| **Coming up** (next appointment) | Appointments list cache first, else `DashboardSnapshot.upcoming` | `dashboardUpcomingShared.ts` (`buildDashboardUpcoming`), `appointmentShared.ts` |

**Coming up rules:** Next future appointment only (reminder optional). Med reminders stay on notifications — not this card. No section title; in-card “Next visit:” eyebrow.

**Coming up specifics:** Appointments refill list cache on save/delete (`load()` after invalidate). Home focus rebuilds upcoming from that cache **immediately**, then the network fetch confirms. Don’t gate the card only on the async dashboard Promise.

**When adding another data card on home:** extend `DashboardSnapshot`, seed state + focus apply, persist on load, invalidate on write paths — same as above. Prefer domain list caches when the card is a projection of an existing list (like Coming up).

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

When you add shared UI patterns, success flows, log lists, collapsing-title pages, or **dashboard home data cards** — **update this file**, not the README.

When you change **product positioning** or **user-visible feature list** — update **`README.md`**.

When you ship polish / fixes — **`CHANGELOG.md`**.
