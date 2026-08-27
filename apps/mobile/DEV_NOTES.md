# Flarecare Mobile — dev notes

**For Simon + AI agents.** Implementation conventions and “don’t duplicate this” reminders. Not user-facing docs.

Product overview, env vars, and how to run the app stay in **`README.md`**. Recent polish / changelog-style notes: **`CHANGELOG.md`**.

**Brain-full cheat sheet — mobile Email:** phone → `EXPO_PUBLIC_WEB_API_BASE_URL` (live = `https://flare-care.vercel.app`) → web route on **`master`**/Vercel → Resend. Details under **Recurring Medical Supplies → Mobile Email → web**.

---

## Known-good checkpoints (rollback)

If reminders / related mobile UX regress while we keep building, start from this commit before deep debugging:

| When verified | Commit / tag | Summary |
|---------------|--------------|---------|
| **2026-08-14** | **`0997203`** · tag **`save-point-polished-baseline`** (on `feat/progress-graph`) | **SAVE POINT — first polished app baseline.** Progress graph on My progress sheet, spring slide-up, news shelf hidden (`SHOW_DASHBOARD_NEWS`). Page transitions + sign-in slide feeling solid; first time the app felt flawless end-to-end. |
| **2026-08-10** | **`ed81d36`** (on `mobile-native`) | Auth polish, new-user intro, welcome cards removed, caption hints — **biometric baseline** |
| **2026-07-23** (working in daily use since 2026-07-06) | **`413eca9`** | **`fix(mobile): med reminders, welcome card overlay, and Reminders UX`** |

### Find / restore the 2026-08-14 SAVE POINT

```bash
# Find it
git log --grep="SAVE POINT"
git show save-point-polished-baseline

# Inspect without moving HEAD
git show 0997203

# Check out the tagged save point (detached) — or branch from it to compare
git checkout save-point-polished-baseline
# git checkout -b recover/polished-baseline save-point-polished-baseline
```

Commit subject starts with **`SAVE POINT:`** so grepping that string always surfaces it. Tag name: **`save-point-polished-baseline`**.

**What was solid at `0997203`:**
- My progress slide-up sheet (Meds ↔ Hydration ↔ progress graph), wash layout, locked card height
- Spring sheet open animation; Meds/Hydration handoff
- Dashboard news shelf gated off via `SHOW_DASHBOARD_NEWS` in `lib/newsShared.ts` (flip to `true` to bring back)
- Overall page transitions / sign-in slide polish felt good together

**What was solid at `413eca9`:**
- Local medication + appointment reminders scheduling / firing after phone-settings permission
- Reminders tab UX (setup copy, auto-refresh on return from settings, no wrong-state flash)
- Confirm modal / delete-account card spacing polish

**Reminders count + schedule rules (`lib/medicationNotifications.ts`):**
- Count is **per OS alarm**, not “1 for meds + 1 for appointments”. Reminders screen: `You have N reminders scheduled` = `getAllScheduledNotificationsAsync().length` (fallback: med + appointment + supply stored IDs).
- **Meds:** one **DAILY** repeating notification per row with `reminders_enabled`. Still scheduled (and counted) even if today’s dose time has already passed.
- **Appointments:** one **DATE** one-shot per row with `reminder_minutes_before != null`, only if `appointmentTime − leadMinutes > now`. If that fire time has passed, rebuild **skips** it — UI can still show a reminder label, but it is **not** in the scheduled count. Opening Reminders / saving a med runs cancel-all + rebuild, so a past lead window can drop the appointment alarm even though the appointment remains upcoming.
- **Supplies:** one **DATE** one-shot per **stocked** kit (`itemCount > 0`) at **09:00 local** on `next_due_date`. Empty kits and past triggers are skipped (overdue stays a dashboard priority — no catch-up ping). Soft gate: schedule only if notification permission is **already** granted (no prompt from supply screens). Tap → `MedicalSupplyOrder` for that kit. Rebuild via `rescheduleSupplyNotificationsForUser` after kit save/delete, first item add / item wipe, and due advance after email send; full rebuild (`rescheduleLocalRemindersIfGranted`) also includes supplies.
- Parse appointments with `getAppointmentDateTime()` (accepts `HH:mm` / optional seconds; plain `YYYY-MM-DD` date). Do **not** build `` new Date(`${date}T${time}:00`) `` — breaks if `time` already has seconds or `date` is ISO.

**Restore check:** `git show <sha>` or `git checkout <sha>` (detached) / create a branch from it if you need to compare.

---

## UI conventions (check before new screens)

Use existing screens as reference — do **not** default to web-style teal hyperlinks.

| Pattern | Reference | Colour / style |
|---------|-----------|----------------|
| **One-line link list** (Account, Legal) | **`OneLineTrayList`** | Label **`c.text`**, chevron — pad **`ONE_LINE_TRAY_PADDING`** |
| **Two-line browse / Logs tray** (title + subtitle, history) | `LogHistoryList` + `onPressItem` in `LogHistoryCard` | Label **`c.text`**, chevron — tray inset **`TRAY_ROW_PADDING_H`** by default |
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
| **After logout → signed-out success** | **`signOutBlocking`** (Splash cover) then **`signOutNotice`** → **`SuccessNoticeScreen`**. Set notice / blocking **before** tearing down session. | Avoids flashing Dashboard or Auth while session clears. |
| **Alert → navigate** (e.g. wellbeing already checked in) | `showFlareAlert(..., { holdUntilDismissed: true })`, navigate in `onPress`, then `dismissFlareAlert()` after next paint. | Keeps the modal as the cover until Dashboard is ready — same idea as logout overlay / Reminders Done. Do **not** use a blank `c.screen` flash in between. |

**Logout success layout:** `SuccessNoticeScreen` `fullScreen` — stable `initialWindowMetrics` safe area + wizard step-0 landing slot (`WIZARD_LANDING_BELOW_SAFE_TOP`, `wizardLandingMinHeight()` in `layoutConstants.ts`). **Do not** use `ScrollView`, `useWindowDimensions`, or animated `SafeAreaView` edges on logout — those caused vertical jump.

---

## Success & confirm screens (do not duplicate)

**Before building a new full-screen checkmark success or yes/no confirm sheet — use the shared components below.**

| Piece | Use for |
|-------|---------|
| **`SuccessNoticeScreen`** (`components/SuccessNoticeScreen.tsx`) | Full-screen **success** state after something completes — green checkmark, title, message, one **`PrimaryButton`**. Pass `title`, `message`, `buttonTitle`, `onPress`. Use `fullScreen` for root-level screens (logout) with no bottom nav. **Always pass `offsetForBottomTabBar`** when the success screen shows while the bottom tab bar is visible (Dashboard, Reminders, Account tab roots). |
| **`ConfirmModal`** (`components/ConfirmModal.tsx`) | **Confirm/cancel** (or single-button **notice**) sheet — follows in-app light/dark. Prefer this over `Alert.alert`. Most destructive confirms use cadet **`confirmDestructive`**; **Delete account** only uses true red **`confirmDanger`**. Renders via **`Portal` → `OverlayOutlet`** (not native `Modal`). |
| **`showFlareAlert` / `FlareAlertHost`** (`components/FlareAlertHost.tsx`) | Drop-in for `Alert.alert(title, message, buttons?)` — renders `ConfirmModal`. Host mounts once under `FlareThemeProvider`. When `onPress` navigates, use `{ holdUntilDismissed: true }` + `dismissFlareAlert()` after paint (see Auth table). |

**Do not** copy the checkmark + title + message + button layout into `App.tsx` or a screen file. Extend **`SuccessNoticeScreen`** props only if a new success pattern is genuinely different (e.g. a second button).

**Bottom nav + success:** if `MainBottomTabBar` is on screen, pass `offsetForBottomTabBar` (uses `bottomTabBarHeight()` from `layoutConstants.ts`). Do not re-measure or duplicate the offset.

**Done → navigate:** navigate to Dashboard on Done; **do not** clear success in `useFocusEffect` cleanup (blur) — that flashes the setup screen during the transition. Clear success only when Reminders **gains focus** again (user re-opens the tab).

**Current uses of `SuccessNoticeScreen`:** post-logout (“Sign in”, `fullScreen` + overlay shell in `App.tsx`), Reminders tab after **Enable notifications** (“Done”, `offsetForBottomTabBar`).

**Logout:** content vertically aligned with wizard step-0 landing; transition smoothness depends on overlay shell + stable layout above — see **Auth / session transitions** under **Light / dark theme**.

---

## New-user intro + caption hints (do not resurrect welcome cards)

**Direction (2026-08):** Per-screen floating welcome / instruction cards are **gone**. New accounts get a **one-shot intro** after first sign-in; hubs use small **caption hints** under lists where helpful. Do **not** reintroduce `FloatingWelcomeCard` / `DashboardWelcomeCard` / `instructionCardCopy` / per-screen `*InstructionTip` modules.

### New-user intro

| Piece | Use for |
|-------|---------|
| **`NewUserIntroScreen`** (`components/NewUserIntroScreen.tsx`) | Full-screen post-login intro — **Done** finishes; copy in **`lib/newUserIntroCopy.ts`**. |
| **`lib/newUserIntro.ts`** | Eligible / dismissed flags + **`isNewAuthUser`** + **`resolveNewUserIntroPending`**. Mark eligible via **`markNewUserIntroEligible`** / **`markNewAccountInstructionTipsEligible`** on new signup only. |
| **`AppRoot`** | Keep **`newUserIntroPending === null`** until resolve finishes — never leave `false` after logout or the bottom nav can flash before intro. |

**Show when:** eligible + not dismissed + recent account (`isNewAuthUser`). Returning users skip intro.

### Caption hints (small helper text)

| Token | Use |
|-------|-----|
| **`FLARE_CAPTION_HINT`** (`layoutConstants.ts`) | Muted 12px helper under hubs / destructive links. Pair with `c.textMuted` at the call site. |

**Live examples:** Logs hub (`App.tsx` `LogsScreen`), Appointment Summary (`AppointmentsListPane`), Account delete hint.

### Auth landing brand (keep in sync)

Sign-in (`AuthScreen`) and **Almost there** (`ProfileSetupScreen`) share the same lockup: **`authLandingBrandRow`** — `BrandMarkIcon` size **28** + **Flarecare** (`authLandingName`), same page padding / centered stack. Do not put a large solo logo back on profile setup.

### `InstructionScreenShell`

Still used as the scroll + FAB shell on tracker / list screens. Pass **`showInstruction={false}`** / **`instruction={null}`** — overlay API is dormant. Do not wire floating cards again.

---

## Today's Activity (Home swipe page)

Home page 1 — **`TodayActivityPulseScreen`**: date title “Today's Activity”, % (water only if no meds; else avg of meds + water), Meds/Water meters, tap rows. Status: **No meds saved yet** / **Nothing taken today** / **Keep going — still time today** / **All done for today**. Same `todaySummary` only.

---

## Log history lists (do not duplicate)

All shared list UI lives in **`components/LogHistoryList.tsx`**. Do **not** hand-roll tray rows or duplicate card wrappers.

### Quick pick — what to use

**Visual pattern:** white **`LogHistoryCard`** → **inset tray** (`surfaceSubtle` — the darker/lighter panel behind rows) → **rows**.

| You are building… | Use |
|-----------------|-----|
| **One-line link rows** (title + chevron only) — Account, Legal | **`OneLineTrayList`** — pad **`ONE_LINE_TRAY_PADDING`**, separator **`ONE_LINE_TRAY_SEPARATOR_PAD`**. Do **not** hand-roll this tray. |
| **Navigate / browse rows** (chevron, **2 lines** title + subtitle) — Logs hub, appointment presets, summary nav | **`LogHistoryCard`** + **`LogHistoryList`** + `onPressItem`. Items: plain `{ id, title }` or **`buildBrowseLogRowItem`** when you need a subtitle. |
| **Saved log history** (title + date, tap → detail) | **`LogHistoryPreviewList`** (or **`LogHistoryList`**) + **`buildTimestampLogRowItem`**. Paginated: **`usePaginatedLogList`** / **`useWizardLogHistory`**. |
| **Read-only counts** (title on left, number on right) — Today → Summary | **`LogHistoryList`** + `trailingText` on each item. |
| **History hub** (list card only) | **`LogHistoryCard`** + list — optional **`FLARE_CAPTION_HINT`** under the card (Logs hub). |
| **Read-only label + value fields** (not tappable rows) — Account info, brief detail screens | **`LogDetailFieldGroup`** in **`LogDetailCard`** — **not** `LogHistoryList`. |

**Default rule:** if it’s a **one-line link list**, use **`OneLineTrayList`**. If it’s a **two-line / history / counts row list on the inset tray**, use **`LogHistoryList`**. Row height and chevron alignment are automatic — **never** copy `minHeight` / spacer logic into a screen. Use `renderLeading` / `getRowStyle` / `multilineTitle` / `renderTrailing={() => null}` when the row shape differs (Bristol chart, talking points).

**One-line tray padding:** **`ONE_LINE_TRAY_PADDING`** / **`ONE_LINE_TRAY_SEPARATOR_PAD`** (`OneLineTrayList` only).

**Tray row padding (Logs / two-line):** every `LogHistoryList` row uses **`TRAY_ROW_PADDING_H`** (horizontal) and **`TRAY_ROW_PADDING_Y`** (vertical). `ACCOUNT_LIST_ROW_PADDING` and `TODAY_GOALS_ROW_PADDING` are aliases of `TRAY_ROW_PADDING_H` — do not invent new per-screen insets. Optional `rowPaddingHorizontal` only to deviate.

**Title→subtitle gap:** **`LOG_TRAY_SECOND_LINE_GAP`** (`STACKED_LINE_GAP` + 1) via `logSecondLine` in `LogHistoryList` — do **not** add per-screen `marginTop: 1` on subtitles.

| Piece | Use for |
|-------|---------|
| **`OneLineTrayList`** | One-line link tray (Account, Legal) — see Quick pick. |
| **`LogHistoryList`** | Two-line / history / counts inset-tray rows — see **Quick pick** and **Row shapes** below. |
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
- **Symptom history** / **Medication tracking history**: `LogHistoryCard` + `LogHistoryPreviewList` + `buildTimestampLogRowItem` + `useWizardLogHistory`
- **Focus refresh:** **`syncExpandedFromCache()`** + **`refresh()`** on focus (not **`resetAndLoad`**) — refetches data; expansion reset only when navigation leaves the section (table above).
- **Load more:** teal **`c.primary`**, underlined, **`FLARE_FONT_SIZE.muted`** — via `logHistoryListStyles.loadMoreLabel`; row sits **outside** the grey tray with `CARD_SECTION_INNER_GAP` margin
- **Bowel** / **My Meds** (`screens/BowelScreen.tsx`, `screens/MedicationsScreen.tsx`): list-first — icon + **Nothing here yet** when empty; **thumb-reach + FAB** (`TrackerThumbFab`). My Meds passes `tabBarClearance={bottomTabBarHeight(...)}`. Bowel list subtitle = **`created_at`**; detail fields use **`occurred_at`** + **Added** header from `created_at`. **Weight** / **Appointments** — same FAB pattern.
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
| `FLARE_CAPTION_HINT` | Small muted helper under hubs / footers (Logs, Appointment Summary, Account delete) |
| `HELP_NAV_LINK_*` | Underlined Help → AccountHelp links (Hydration, Reminders, Track Meds); pair with `c.text` |
| `CONFIRM_MODAL_*` | Confirm / notice modal title + message + action gap tokens |
| `INSTRUCTION_CARD_*` | Legacy layout tokens for dormant overlay shell — **do not** wire floating welcome cards again |
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
**In-page headings** (e.g. “What is Flarecare?”, “Contact”) stay **18px** — same as dashboard section titles.

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

**Countdown:** owned by **`AuthOtpCountdown`** (child) so the code field is not re-rendered every second. **Resend** only appears after the timer hits zero (replaces the countdown).

**Verify errors:** Supabase often returns one blob for wrong + expired (`Token has expired or is invalid`). Use **one** friendly message via **`otpVerifyErrorMessage`** — do not pretend we can split those cases from the API string. Current copy: *The code you entered is incorrect. Please check the digits and try again. You can request a new one once the timer ends.*

**Key exports (`lib/otpAuth.ts`):** `OTP_EXPIRY_SECONDS`, `OTP_MAX_RESENDS`, `formatOtpCountdown`, `otpRemainingSeconds`, `isOtpExpired`, `otpVerifyErrorMessage`, `otpResendErrorMessage`.

**Alerts / overlays:** `ConfirmModal` portals into **`OverlayOutlet`** (`lib/overlayPortal.tsx`). Register/unregister in **`useLayoutEffect`** so a dismissed full-screen Pressable cannot linger and steal TextInput taps.

---

## Biometric app lock + quick-login (fingerprint / Face ID)

### App lock (signed-in cover)

**UI:** `components/BiometricLockScreen.tsx`. **Helpers:** `lib/biometricLock.ts` (`authenticate`, `readLockEnabled`, `setLockEnabled`, …).

When App lock is ON and the app returns from background, show the lock cover over the already-mounted app (keeps nav state). Auto-prompt **once** on mount (`promptedRef` + stable `attempt`) so `appShellReady` / dashboard re-renders cannot cancel the OS sheet. Fingerprint affordance + **Sign out** at the bottom.

**Restore note (2026-08-12):** biometric helpers match checkpoint **`ed81d36`**. Do not reintroduce AppState “active-only” / outside-`content` lock experiments without a device repro — they made this worse.

### Bank-style quick-login (signed-out landing)

**UI:** `App.tsx` (`AuthScreen` + `runQuickUnlock`, `AppRoot.finishSignOut`). **Helpers:** `lib/rememberedSession.ts` (SecureStore refresh token), `lib/biometricLock.ts`, `lib/supabase.ts` (`clearLocalSupabaseSession`).

**The prompt only arms on an explicit logout while App lock is ON.** That's the *only* place we save the refresh token (`finishSignOut` → `rememberSession`). Don't expect it after other flows:

| Scenario | Prompt on next landing? | Why |
|----------|------------------------|-----|
| **Log out** (App lock on) | **Fingerprint control shown** (tap to unlock — **no** auto OS sheet) | `finishSignOut` saves the refresh token to SecureStore |
| **Fresh signup / first login** | **No** | New login lands straight in the app; nothing is remembered until the *next* logout |
| **Delete account** | **No** | `handleDeleteAccountConfirm` calls `clearRememberedSession()` — token wiped, and the server account is gone anyway |
| **Log out with App lock OFF** | **No** | `finishSignOut` takes the else-branch: `clearRememberedSession()` + full `supabase.auth.signOut()` |

**Fingerprint affordance UX:** always show the bottom fingerprint + “Tap to unlock…” when quick-login is armed. **Do not** auto-prompt on landing (especially after Sign in from the logout notice). Layout matches **`BiometricLockScreen`** (fingerprint + reserved Sign out row height) so Y positions align.

**Do not "fix" the fresh-signup case by auto-prompting** — that was deliberately removed to stop double-prompting on first login.

**Critical (intermittency bug):** on a remembered logout we must **not** call `supabase.auth.signOut()` (even `scope: "local"` hits the server and revokes the token). We use `clearLocalSupabaseSession()` (local storage wipe only) **and** `supabase.auth.stopAutoRefresh()` — otherwise the still-live in-memory session's auto-refresh timer rotates the saved token and re-persists the session, so the next cold start skips the landing and the prompt never shows. Re-arm with `startAutoRefresh()` on the next successful sign-in (`onSignedIn`).

---

## Auth / OTP / overlay gotchas (fix here first)

Hard-won from the 2026-08 sign-in redesign. Check this table **before** inventing a new theory.

| Symptom | Likely cause | Fix / rule |
|---------|--------------|------------|
| **Can't type in verification code** (email field worked) | (1) Parent re-renders every 1s from OTP countdown; (2) **ghost** full-screen `ConfirmModal` Pressable still in `OverlayOutlet` after dismiss; (3) fingerprint `Pressable` later sibling overlapping a tall code form | (1) Keep countdown in **`AuthOtpCountdown`** (or any child) — never `setInterval` → `setState` on whole `AuthScreen`. Prefer plain `useState` for the code field, not RHF if it fights focus. (2) Portal sync/cleanup in **`useLayoutEffect`**; `ConfirmModal` keeps `Portal` mounted and syncs `null` when `visible={false}`. After Fast Refresh with a stuck overlay: **full app reload**. (3) Raise form `zIndex` above fingerprint row; don't let a later sibling steal taps. |
| **User taps OK on “Check your email” but still can't focus the field** | Overlay registry race (`useEffect` cleanup after paint) or Fast Refresh left a stale portal entry | `overlayPortal.tsx` must clear on unmount; full reload; focus input in alert `onPress` via ref after `InteractionManager.runAfterInteractions`. |
| **Wrong code shows “expired / wait for timer / Resend”** | Parsing Supabase `error.message` for `expired` vs `invalid` — API often returns **both** in one string | **One** message only (`otpVerifyErrorMessage`). Never claim we know wrong vs expired from the API. Don't tell them to tap **Resend** while the countdown is still visible — Resend **replaces** the timer only when it hits 0. |
| **Google return: splash stuck, Dashboard maybe underneath** | `newUserIntroPending` re-nulled **after** the user.id effect already resolved (Google `SIGNED_IN` / `onSignedIn` race). Splash shows while `pending === null` and never clears | **Never** `setNewUserIntroPending(null)` from `onAuthStateChange` or `onSignedIn`. Only the **`user.id` effect** may null → resolve. Clear `authBusy` **before** `onSignedIn` once the session exists. Reset `appShellReady` on logout. |
| **Fingerprint / Face ID sheet flashes then vanishes** (app lock) | `authenticate` re-fired when parent re-rendered (`appShellReady`) because `onUnlock` was in effect deps | **`BiometricLockScreen`**: prompt once via ref; do not put `onUnlock` in the auto-prompt effect deps. |
| **Share / dismiss → fingerprint keeps locking** | App lock listened for `inactive` + `background`; OS Share sheet backgrounds the app | Re-lock only on **`background`**, and wrap `Share.share` in **`withAppLockExternalUi`** (`biometricLock.ts`). Same for news / appointment summary share. |
| **Fingerprint sits in the user's face** on sign-in landing | Auto OS prompt on AuthScreen mount | **No auto-prompt** on landing — always show tap affordance when quick-login is armed. |
| **Fingerprint Y doesn't match lock screen** | Missing reserved Sign out row height on auth landing | Match **`BiometricLockScreen`** bottom stack (fingerprint + invisible Sign out slot). |
| **Almost there looks different from sign-in** | Large solo logo / old `authShell` layout | Same **`authLandingBrandRow`** as `AuthScreen` (icon 28 + name). |
| **Tempted to bring back welcome cards** | Old `DEV_NOTES` / muscle memory | **Don't.** Intro + `FLARE_CAPTION_HINT` only. Shell may stay; cards stay dead. |
| **`master..HEAD` shows 100+ commits** on a new feat branch | Branch was cut from `mobile-native` tip, not from `master` | Commits **since this branch was created**: `git log --oneline <branch-create-sha>..HEAD` (check `git reflog show <branch>`). |

**OTP field checklist if typing breaks again:**
1. Full reload (clear ghost overlay).
2. Confirm `AuthOtpCountdown` is isolated — no `otpTick` on `AuthScreen`.
3. Confirm `OverlayOutlet` is empty when no alert is visible (no absoluteFill Pressable).
4. Confirm code field uses local state + `editable` not stuck false.
5. Temporarily hide fingerprint affordance — if typing works, it's z-order / overlap.

**Destructive confirms:** most use cadet (`confirmDestructive`). **Delete account** only uses true red (`confirmDanger` / `c.destructiveFill`).

---

## Dashboard home — seed data cards (no layout jump)

**Problem:** Home cards that show/hide or change height from fetched data (greeting weather, Coming up, today counts, news) will **jump** when the user adds/deletes elsewhere and returns — if UI waits for the focus refetch before updating.

**Pattern (do this for any new dashboard card that displays live data):**

1. **Keep an in-memory seed** in `lib/dashboardSnapshotCache.ts` (`DashboardSnapshot` + `dashboardSnapshotByUserId`).
2. **`useState(() => snapshotSeed?.… ?? fallback)`** so remounts don’t flash empty → filled.
3. On **`useFocusEffect`**, apply the seed **synchronously** before the async load (greeting weather, Coming up from list caches).
4. After fetch, write results back into the snapshot **and** `setState`.
5. On mutate (add/edit/delete), call **`invalidateDashboardSnapshot(userId)`** — this **keeps weather + news** in the seed (only resets today counts) so the greeting doesn’t flash “Loading…” on return. Keep domain list caches warm (`fetchXForUser` / `setXListCache` after save) so the next focus can seed correctly.

| Card / block | Seed source | Files |
|--------------|-------------|--------|
| **Greeting / weather** | `DashboardSnapshot.weatherMeta` / `weather` | `App.tsx` `DashboardScreen`, `dashboardSnapshotCache.ts` |
| **Today counts** | `DashboardSnapshot.todaySummary` (incl. `wellbeingLogged`) | same |
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

## Today's priorities (dashboard)

**Job:** Action nudges for *today* on the home shelf (last section). Not a to-do list. Not View progress.

| Feature | Job |
|---------|-----|
| **View progress** | Reflective Meds / Hydration / graph sheet from My health |
| **Today's priorities** | Incomplete actions: remaining meds, hydration nudge, check-in, today/tomorrow appt, **supplies due/overdue** |
| **Supplies** | Bottom nav tab only — not on this card |

Helpers: `lib/todayPriorities.ts` (`buildTodayPriorities`, `findNearTermAppointment`). Reuses `todaySummary` from the dashboard snapshot; appointments are cache-first via `appointmentShared`. Cap 3 rows + **View all** expands in-card. Caught-up empty state still shows the section.

**Look (trial):** white card + inset `surfaceSubtle` tray, **emoji** lines, no separators / not tappable — so this shelf reads differently from Check in tiles and list trays. Shelf order: Check in → **Today's priorities** → My health / My care → News (if on).

---

## Recurring Medical Supplies (v1)

**Purpose:** Named reorder orders + stock + Request supplies (Share / Email / Copy message). **Nothing auto-sent.** Not prescriptions / partner linking.

| Piece | Location |
|-------|----------|
| Shared CRUD / request text / due helpers | `lib/medicalSuppliesShared.ts` |
| Order list + order detail + in-place setup | `screens/MedicalSuppliesScreen.tsx` + `MedicalSuppliesSetupScreen.tsx` |
| Request with order-name picker | `screens/MedicalSupplyRequestScreen.tsx` |
| Add/edit item sheet | `components/MedicalSupplyItemSheet.tsx` |
| Email API (web) | Repo root: `src/app/api/send-supply-request-email/route.js` |
| Tables | `medical_supply_kits` (named orders), `medical_supplies` (`kit_id`) |

**Setup:** intro → **name** → how often (week / 2 / 4 / **custom weeks**) → next due. Stock on the order detail (+). Multiple orders via hub **+**. Light multi-step form on the Supplies **tab** — **not** a health wizard (no step counter / wizard landing). Bare page (no cards) uses **`INFORMATIONAL_PAGE_HORIZONTAL_PADDING`** (same gutter as About / IBD / guides) — not `SCREEN_EDGE_PADDING`.

**Request:** pick order name → loads that kit’s stock + saved wording. **Email** persists `recipient_email`, `email_subject`, `request_body` on the kit (pre-fill next time) **and** advance `next_due_date`, then leaves the request screen. **Share** / **Copy message** = handoff only (stay on screen; no save, no due advance). No separate “Remember” button — email send *is* remember.

**Due-day phone alert:** fixed **09:00 local** on `next_due_date` for stocked orders only (see Reminders schedule rules above). No per-order reminder time — due is a date; Edit setup is for changing that date / cadence, not a clock. Example: order due tomorrow → fires tomorrow 09:00 if permission is on and the order has stock.

### Mobile Email → web (READ THIS)

Same monorepo. Mobile does **not** send mail itself.

1. Phone POSTs to `EXPO_PUBLIC_WEB_API_BASE_URL` + `/api/send-supply-request-email`
2. Live value in `apps/mobile/.env`: **`https://flare-care.vercel.app`** (no trailing slash)
3. That route lives in the **web** app (`src/app/api/...`). Production branch is **`master`** → Vercel
4. Most data still = **Supabase**. Web is only for shared API routes (supply email, appointment brief email, reports, etc.)

| Symptom | Meaning | Fix |
|---------|---------|-----|
| Stuck on Sending… then “Network request failed” | Phone can’t reach the base URL (localhost / dead LAN IP) | Point `.env` at live Vercel URL; restart Expo `--clear` |
| Instant “Could not send” / generic fail | Route missing on Vercel (404) or Resend rejected | Deploy route on **`master`**; check Vercel Resend env vars |
| Works only to *your* email | Resend free / unverified domain | Normal until you verify a domain in Resend |

**Ship a new email API:** commit the `src/app/api/...` file → push **`master`** → wait for Vercel Ready → then test on phone. Local `npm run dev` web is not what the phone uses when `.env` points at Vercel.

### Supabase SQL (run in dashboard SQL editor)

```sql
-- Named orders (multi per user)
create table if not exists public.medical_supply_kits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  cadence_days int not null default 7,
  next_due_date date not null,
  recipient_email text,
  email_subject text,
  request_body text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists medical_supply_kits_user_id_idx
  on public.medical_supply_kits (user_id);

alter table public.medical_supply_kits enable row level security;

create policy "medical_supply_kits_select_own"
  on public.medical_supply_kits for select
  using (auth.uid() = user_id);

create policy "medical_supply_kits_insert_own"
  on public.medical_supply_kits for insert
  with check (auth.uid() = user_id);

create policy "medical_supply_kits_update_own"
  on public.medical_supply_kits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "medical_supply_kits_delete_own"
  on public.medical_supply_kits for delete
  using (auth.uid() = user_id);

-- Items (per named order)
create table if not exists public.medical_supplies (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kit_id bigint not null references public.medical_supply_kits (id) on delete cascade,
  name text not null,
  quantity text not null,
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists medical_supplies_user_id_idx on public.medical_supplies (user_id);
create index if not exists medical_supplies_kit_id_idx on public.medical_supplies (kit_id);

alter table public.medical_supplies enable row level security;

create policy "medical_supplies_select_own"
  on public.medical_supplies for select
  using (auth.uid() = user_id);

create policy "medical_supplies_insert_own"
  on public.medical_supplies for insert
  with check (auth.uid() = user_id);

create policy "medical_supplies_update_own"
  on public.medical_supplies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "medical_supplies_delete_own"
  on public.medical_supplies for delete
  using (auth.uid() = user_id);
```

**If you already created the old single-kit schema** (`medical_supply_kits.user_id` as PK, no `kit_id` on items), migrate carefully or recreate in a fresh project. Dev-friendly wipe + recreate:

```sql
drop table if exists public.medical_supplies;
drop table if exists public.medical_supply_kits;
-- then run the create statements above
```

### My Output (`track_output`)

Fluid / measurement log (ml + time + type). Run in the Supabase SQL editor before testing the hub:

```sql
create table if not exists public.track_output (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml numeric not null,
  kind text not null default 'other',
  occurred_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists track_output_user_id_idx
  on public.track_output (user_id);

create index if not exists track_output_user_occurred_at_idx
  on public.track_output (user_id, occurred_at desc);

alter table public.track_output enable row level security;

create policy "track_output_select_own"
  on public.track_output for select
  using (auth.uid() = user_id);

create policy "track_output_insert_own"
  on public.track_output for insert
  with check (auth.uid() = user_id);

create policy "track_output_update_own"
  on public.track_output for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "track_output_delete_own"
  on public.track_output for delete
  using (auth.uid() = user_id);
```

**If you already created `track_output` without `kind`**, run this alter:

```sql
alter table public.track_output
  add column if not exists kind text not null default 'other';
```

---

## Looking ahead

Product backlog for later — not implementation work yet. Ship notes go in **`CHANGELOG.md`**; this list is “we want to do”.

### Auth — more OAuth providers

- **Now:** email OTP + **Google** only on the method screen.
- **Later:** add more OAuth (e.g. Apple). Do **not** stack many full-width provider buttons under email — the quick-unlock fingerprint is pinned to the bottom and will collide.
- **Preferred approach:** keep email (+ maybe one OAuth) on the landing; put extra providers behind **“More ways to sign in”** (sheet) or a compact icon row.

---

## Keeping these notes useful

When you add shared UI patterns, success flows, log lists, collapsing-title pages, **dashboard home data cards**, or **auth/biometric gotchas** — **update this file**, not the README. If something took more than one wrong guess to fix, add a row to **Auth / OTP / overlay gotchas**.

When you change **product positioning** or **user-visible feature list** — update **`FEATURES.md`** (full inventory) and the short map in **`README.md`**.

When something is **planned but not built** — add a short bullet under **Looking ahead** (and mirror in **`FEATURES.md` → Looking ahead** if it’s product-facing).

When you ship polish / fixes — **`CHANGELOG.md`**.
