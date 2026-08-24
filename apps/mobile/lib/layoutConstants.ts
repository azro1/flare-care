import { Dimensions, Platform } from "react-native";

/** Horizontal inset for screens, cards, and header controls. */
export const SCREEN_EDGE_PADDING = 12;

/** Padding inside white cards (`trackerCard`, `styles.card`, etc.) — edge of card → content. */
export const CARD_INNER_PADDING = 14;

/** Slightly roomier padding for first-time welcome cards. */
export const WELCOME_CARD_INNER_PADDING = 18;

/** Section welcome cards match the dashboard "Getting Started" card — our largest welcome. */
export const WELCOME_CARD_MIN_HEIGHT = 280;

/**
 * Card-less informational pages (About, What is IBD?, legal) — a soft inset
 * that sits just inside the header controls (chevron / ⋮ at SCREEN_EDGE_PADDING)
 * so body text lines up closely with them instead of floating far inward.
 */
export const INFORMATIONAL_PAGE_HORIZONTAL_PADDING = 18;

/** Horizontal inset for every `LogHistoryList` tray row (inside the grey tray). */
export const TRAY_ROW_PADDING_H = 16;

/** Vertical pad for every `LogHistoryList` tray row. */
export const TRAY_ROW_PADDING_Y = 12;

/**
 * Alias of `TRAY_ROW_PADDING_H` — Account / browse trays.
 * Prefer `TRAY_ROW_PADDING_H` in new code; keep this export so existing call sites stay valid.
 */
export const ACCOUNT_LIST_ROW_PADDING = TRAY_ROW_PADDING_H;

/**
 * Dashboard Today’s activity tray — horizontal matches shared tray default.
 * @deprecated Prefer `ONE_LINE_TRAY_PADDING` for one-line link trays.
 */
export const TODAY_GOALS_ROW_PADDING = TRAY_ROW_PADDING_H;

/** @deprecated Prefer `ONE_LINE_TRAY_SEPARATOR_PAD`. */
export const TODAY_GOALS_ROW_PADDING_Y = 16;

/** @deprecated Use `ONE_LINE_TRAY_PADDING`. */
export const TRAY_IN_CARD_PADDING = 20;

/** @deprecated Use `ONE_LINE_TRAY_SEPARATOR_PAD`. */
export const TRAY_IN_CARD_SEPARATOR_PAD = 20;

/**
 * Outer pad inside the dark tray for **one-line** link lists (`OneLineTrayList` — Account, Legal).
 * Not the Logs two-line tray (`TRAY_ROW_PADDING_*`).
 */
export const ONE_LINE_TRAY_PADDING = TRAY_IN_CARD_PADDING;

/** Space above/below the hairline between one-line tray rows. */
export const ONE_LINE_TRAY_SEPARATOR_PAD = TRAY_IN_CARD_SEPARATOR_PAD;

/** Dashboard Recent Activity — matches `styles.recentActivityFeed` / feed row layout. */
export const RECENT_ACTIVITY_ROW_GAP = 14;
/** Max row height (single-line title + timestamp) — matches original static card. */
export const RECENT_ACTIVITY_ROW_HEIGHT = 42;
/** Rows visible in the feed before scrolling. */
export const RECENT_ACTIVITY_VISIBLE_ROWS = 2;

export function recentActivityFeedMaxHeight(visibleRows = RECENT_ACTIVITY_VISIBLE_ROWS): number {
  return visibleRows * RECENT_ACTIVITY_ROW_HEIGHT + Math.max(visibleRows - 1, 0) * RECENT_ACTIVITY_ROW_GAP;
}

/**
 * Dashboard content above the pill body (greeting, check-in, recent activity, segment row, paddings).
 * Used so short pill tabs keep a stable min height vs news shelf.
 */
export const HOME_DASHBOARD_CHROME_ABOVE_PILL_BODY = 420;

/** Floor for home pill body min height when the window is short. */
export const HOME_PILL_BODY_MIN_HEIGHT_FLOOR = 280;

/** Native `DateTimePicker` time mode — medication reminders, bowel log, etc. */
export const TIME_PICKER_MINUTE_INTERVAL = 5;

/** Icon row + labels in the custom bottom tab bar (excludes home-indicator padding). */
export const BOTTOM_TAB_BAR_BODY_HEIGHT = 48;

/** Full rendered height of `MainBottomTabBar` — keep in sync with `App.tsx` styles. */
export function bottomTabBarHeight(bottomInset: number): number {
  const homeIndicatorPad = Math.max(bottomInset, 10);
  // wrap paddingTop 8 + item (paddingVertical 4 + icon 23 + gap 3 + label ~14) + wrap paddingBottom
  return 8 + BOTTOM_TAB_BAR_BODY_HEIGHT + homeIndicatorPad;
}

/** Scroll padding so content clears the overlaid tab bar on Home / Reminders / Account. */
export function bottomTabBarScrollInset(bottomInset: number): number {
  return bottomTabBarHeight(bottomInset) + SCREEN_EDGE_PADDING;
}

/** Inset for muted placeholder copy inside a `surfaceSubtle` empty tray. */
export const EMPTY_TRAY_PADDING = 14;

/** Space between sibling home tiles: Daily Check-in scroll + More grid. */
export const HOME_TILE_GAP = 12;

/**
 * Digits optically read larger than letters at muted (13).
 * Use caption (12) for values that contain a number, date, or time.
 */
export function flareTextHasDigit(text: string): boolean {
  return /\d/.test(text);
}

export const FLARE_FONT_SIZE = {
  /** Numbers / dates / times — digits read larger than letters at muted. */
  caption: 12,
  muted: 13,
  body: 14,
  /** Between body and nav — shelf titles, secondary links (e.g. Appointment Summary). */
  subhead: 15,
  navTitle: 16,
  sectionTitle: 18,
  /** Informational scroll pages (e.g. What is IBD?, About) — larger at rest so collapse reads clearly. */
  pageTitle: 22,
} as const;

export const FLARE_LINE_HEIGHT = {
  caption: 16,
  muted: 18,
  body: 20,
  subhead: 21,
  sectionTitle: 22,
  pageTitle: 27,
} as const;

/** Pair for collapsing titles on informational pages — use via `titlePreset="informational"`. */
export const INFORMATIONAL_PAGE_TITLE = {
  fontSize: 18,
  lineHeight: 23,
} as const;

export const FLARE_FONT_FAMILY = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

/** Gap between stacked text lines — list title→subtitle, detail label→value. */
export const STACKED_LINE_GAP = 4;

/**
 * Title→subtitle gap inside `LogHistoryList` trays.
 * `STACKED_LINE_GAP` plus the +1 optical pad Logs browse rows use — do not re-add `marginTop: 1` in screens.
 */
export const LOG_TRAY_SECOND_LINE_GAP = STACKED_LINE_GAP + 1;

/** Confirm / notice modal — title→message. */
export const CONFIRM_MODAL_STACK_GAP = 8;
/** Confirm / notice modal — message→actions. */
export const CONFIRM_MODAL_ACTIONS_GAP = 16;

/** Confirm / notice modal title — shared by every `ConfirmModal`. */
export const CONFIRM_MODAL_TITLE = {
  fontSize: FLARE_FONT_SIZE.sectionTitle,
  fontFamily: FLARE_FONT_FAMILY.bold,
} as const;

/** Confirm / notice modal body — shared by every `ConfirmModal`. */
export const CONFIRM_MODAL_MESSAGE = {
  fontSize: FLARE_FONT_SIZE.body,
  lineHeight: FLARE_LINE_HEIGHT.body,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/** Stacked field labels on log detail / review screens (`StackedDetailField`). */
export const DETAIL_FIELD_LABEL = {
  fontSize: FLARE_FONT_SIZE.muted,
  lineHeight: FLARE_LINE_HEIGHT.muted,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/**
 * Small helper under links / footers (Appointment Summary hint, Account delete hint, etc.).
 * Pair with `textMuted` (or another color) at the call site.
 */
export const FLARE_CAPTION_HINT = {
  fontSize: FLARE_FONT_SIZE.caption,
  lineHeight: FLARE_LINE_HEIGHT.caption,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/**
 * Secondary text actions next to shelf titles / under lists —
 * See my progress, See all, load more. Medium so they stay readable at small size.
 * Pair with `primary` (or another color) at the call site. Add underline only if the pattern needs it.
 */
export const FLARE_INLINE_ACTION_LINK = {
  fontSize: FLARE_FONT_SIZE.muted,
  lineHeight: FLARE_LINE_HEIGHT.muted,
  fontFamily: FLARE_FONT_FAMILY.medium,
} as const;

/** Tappable navigate row label — Account lists, wizard Edit, chart links. */
export const NAV_ROW_LABEL = {
  fontSize: FLARE_FONT_SIZE.body,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/** Navigate / disclosure chevrons (`chevron-forward` / `-down` / `-up`). Not header back. */
export const NAV_ROW_CHEVRON_SIZE = FLARE_FONT_SIZE.navTitle;

/** In-card section title — Account, wizard review (`FlareScreenSectionTitle inCard`). */
export const CARD_SECTION_TITLE = {
  fontSize: FLARE_FONT_SIZE.body,
  fontFamily: FLARE_FONT_FAMILY.bold,
} as const;

/** `styles.dashboardSectionTitle` / `dashboardSectionTitleLeft` spacing. */
export const SECTION_TITLE_MARGIN_TOP = 10;
export const SECTION_TITLE_MARGIN_BOTTOM = 12;
/** Gap below in-card section title before card body (Account, wizard review). */
export const CARD_SECTION_INNER_GAP = 12;

/**
 * Home dashboard: vertical gap between sibling cards / tile blocks.
 * Same as a titled shelf (card/tile `marginBottom` 12 + title mt + title mb).
 * When a section has no title, still use this between blocks — never leave only the 12px card margin.
 */
export const DASHBOARD_BLOCK_GAP =
  CARD_SECTION_INNER_GAP + SECTION_TITLE_MARGIN_TOP + SECTION_TITLE_MARGIN_BOTTOM;
/** Extra top inset when the previous block already has the 12px bottom margin (replaces a missing title). */
export const DASHBOARD_UNTITLED_AFTER_BLOCK =
  SECTION_TITLE_MARGIN_TOP + SECTION_TITLE_MARGIN_BOTTOM;

/** Floating instruction cards — dashboard welcome + future per-screen tips. */
export const INSTRUCTION_CARD_RADIUS = 14;
export const INSTRUCTION_CARD_PADDING_H = 20;
export const INSTRUCTION_CARD_PADDING_TOP = SCREEN_EDGE_PADDING + 2;
export const INSTRUCTION_CARD_PADDING_BOTTOM = 20;
export const INSTRUCTION_CARD_ACCENT_WIDTH = 4;
export const INSTRUCTION_CARD_BORDER_WIDTH = 1.5;
export const INSTRUCTION_CARD_HEADER_GAP = 10;
export const INSTRUCTION_CARD_HEADER_BODY_GAP = 8;
export const INSTRUCTION_CARD_BODY_GAP = CARD_SECTION_INNER_GAP;
export const INSTRUCTION_CARD_ICON_WELL_SIZE = 36;
export const INSTRUCTION_CARD_CLOSE_SIZE = 30;
export const INSTRUCTION_CARD_TITLE_ICON_ALIGN_PAD = 6;
/** Header icon in instruction cards — one size for Ion + MCI. */
export const INSTRUCTION_CARD_ICON_SIZE = 22;
export const INSTRUCTION_CARD_CLOSE_ICON_SIZE = FLARE_FONT_SIZE.body;
/** Top offset when floating over dashboard scroll (`dashboardWelcomeFloat`). */
export const INSTRUCTION_CARD_FLOAT_TOP = SCREEN_EDGE_PADDING;

/** Shared absolute overlay — dashboard welcome + wizard step-0 instruction cards. */
export const INSTRUCTION_CARD_FLOAT_STYLE = {
  position: "absolute" as const,
  top: INSTRUCTION_CARD_FLOAT_TOP,
  left: SCREEN_EDGE_PADDING,
  right: SCREEN_EDGE_PADDING,
  zIndex: 20,
};

/** Full-screen dim behind instruction cards — never add elevation (Android → solid black). */
export const INSTRUCTION_CARD_SCRIM_STYLE = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 19,
} as const;

export const INSTRUCTION_CARD_TITLE = {
  fontSize: FLARE_FONT_SIZE.sectionTitle,
  lineHeight: FLARE_LINE_HEIGHT.sectionTitle,
  fontFamily: FLARE_FONT_FAMILY.bold,
} as const;

export const INSTRUCTION_CARD_BODY = {
  fontSize: FLARE_FONT_SIZE.body,
  lineHeight: 22,
  letterSpacing: 0.2,
  fontFamily: FLARE_FONT_FAMILY.medium,
} as const;

/** Native stack nav row height (below status bar). */
export const NAV_HEADER_BAR_HEIGHT = Platform.select({ ios: 44, default: 56 }) ?? 56;

/** Stable window height for first-frame layout math (wizard landing, logout success align). */
export const APP_WINDOW_HEIGHT = Dimensions.get("window").height;

/** Floating + on tracker hub screens (Bowel, My Meds, Weight, Appointments). */
export const TRACKER_THUMB_FAB_SIZE = 56;

const TRACKER_THUMB_FAB_LIFT_RATIO = 0.05;

/** Bottom offset from screen edge — safe-area lip or tab bar + thumb lift. */
export function trackerThumbFabBottom(
  bottomInset: number,
  options?: { windowHeight?: number; tabBarClearance?: number },
): number {
  const windowHeight = options?.windowHeight ?? APP_WINDOW_HEIGHT;
  const lift = Math.round(windowHeight * TRACKER_THUMB_FAB_LIFT_RATIO);
  const tabBarClearance = options?.tabBarClearance ?? 0;
  if (tabBarClearance > 0) {
    return tabBarClearance + lift;
  }
  return Math.max(bottomInset, 12) + lift;
}

export function trackerThumbFabInsetRight(rightInset: number): number {
  return Math.max(rightInset, SCREEN_EDGE_PADDING) + SCREEN_EDGE_PADDING * 3;
}

/** Scroll content padding so list/tip clears the thumb FAB. */
export function trackerThumbFabScrollPadding(fabBottom: number): number {
  return fabBottom + TRACKER_THUMB_FAB_SIZE + SCREEN_EDGE_PADDING + 4;
}

/** Screen edge → full-width primary CTA (sign-in, wizard landing, logout success). */
export const FULL_WIDTH_CTA_EDGE_PADDING = 26;

/** Wizard step-0 `ScrollView` top inset — keep in sync with wizard screens. */
export const WIZARD_LANDING_SCROLL_TOP_PADDING = 16;

/** Below safe area on full-screen surfaces: stack header + wizard scroll top pad. */
export const WIZARD_LANDING_BELOW_SAFE_TOP = NAV_HEADER_BAR_HEIGHT + WIZARD_LANDING_SCROLL_TOP_PADDING;

/** Wizard step-0 `styles.landing` vertical padding — keep in sync with wizard screens. */
export const WIZARD_LANDING_BLOCK_PADDING_TOP = 8;
export const WIZARD_LANDING_BLOCK_PADDING_BOTTOM = 32;

/** Wizard step-0 landing block `minHeight` — keep in sync with wizard screens. */
export function wizardLandingMinHeight(windowHeight = APP_WINDOW_HEIGHT): number {
  return Math.max(windowHeight * 0.58, 420);
}

/** Collapsing page title (`CollapsingTitleScrollScreen`). */
export const COLLAPSING_TITLE_GAP_BELOW_HEADER = 12;
/** Gap below the large title before body text (at rest + scroll clearance while title animates up). */
export const COLLAPSING_TITLE_CONTENT_GAP = 16;
export const COLLAPSING_TITLE_SCROLL_DISTANCE = 80;

export const COLLAPSING_TITLE_BLOCK_HEIGHT =
  FLARE_LINE_HEIGHT.sectionTitle + COLLAPSING_TITLE_CONTENT_GAP;

/** Default collapse scale when expanded title uses `sectionTitle`. */
export const COLLAPSING_TITLE_COLLAPSED_SCALE =
  FLARE_FONT_SIZE.navTitle / FLARE_FONT_SIZE.sectionTitle;

export function collapsingTitleCollapsedScale(expandedFontSize: number) {
  return FLARE_FONT_SIZE.navTitle / expandedFontSize;
}

export function collapsingTitleBlockHeight(expandedLineHeight: number) {
  return expandedLineHeight + COLLAPSING_TITLE_CONTENT_GAP;
}
