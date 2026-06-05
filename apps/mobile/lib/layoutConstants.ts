import { Platform } from "react-native";

/** Horizontal inset for screens, cards, and header controls. */
export const SCREEN_EDGE_PADDING = 12;

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

/** `styles.dashboardSectionTitle` / `dashboardSectionTitleLeft` spacing. */
export const SECTION_TITLE_MARGIN_TOP = 10;
export const SECTION_TITLE_MARGIN_BOTTOM = 12;

/** Native stack nav row height (below status bar). */
export const NAV_HEADER_BAR_HEIGHT = Platform.select({ ios: 44, default: 56 }) ?? 56;

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
