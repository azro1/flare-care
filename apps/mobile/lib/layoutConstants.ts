import { Dimensions, Platform } from "react-native";

/** Horizontal inset for screens, cards, and header controls. */
export const SCREEN_EDGE_PADDING = 12;

/** Extra inset for Account tab link rows inside the grey tray (My account, Legal). */
export const ACCOUNT_LIST_ROW_PADDING = 20;

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
  const barHeight = bottomTabBarHeight(bottomInset);
  // Tab bar is absolutely positioned; stacks are full height. Pad by bar height plus the
  // scroll slack that used to live inside the flex-shortened area above the bar.
  return barHeight * 2;
}

/** Inset for muted placeholder copy inside a `surfaceSubtle` empty tray. */
export const EMPTY_TRAY_PADDING = 14;

/** Space between sibling home tiles: Daily Check-in scroll + More grid. */
export const HOME_TILE_GAP = 12;

export const FLARE_FONT_SIZE = {
  muted: 13,
  body: 14,
  navTitle: 16,
  sectionTitle: 18,
  /** Informational scroll pages (e.g. What is IBD?, About) — larger at rest so collapse reads clearly. */
  pageTitle: 22,
} as const;

export const FLARE_LINE_HEIGHT = {
  muted: 18,
  body: 20,
  sectionTitle: 22,
  pageTitle: 27,
} as const;

/** Pair for collapsing titles on informational pages — use via `titlePreset="informational"`. */
export const INFORMATIONAL_PAGE_TITLE = {
  fontSize: FLARE_FONT_SIZE.pageTitle,
  lineHeight: FLARE_LINE_HEIGHT.pageTitle,
} as const;

export const FLARE_FONT_FAMILY = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

/** Stacked field labels on log detail / review screens (`StackedDetailField`). */
export const DETAIL_FIELD_LABEL = {
  fontSize: FLARE_FONT_SIZE.muted,
  lineHeight: FLARE_LINE_HEIGHT.muted,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/** Tappable navigate row label — Account lists, wizard Edit, chart links. */
export const NAV_ROW_LABEL = {
  fontSize: FLARE_FONT_SIZE.body,
  fontFamily: FLARE_FONT_FAMILY.regular,
} as const;

/** Chevron on navigate rows (`chevron-forward`). */
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
