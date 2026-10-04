/**
 * Midnight Lagoon Design System Tokens
 * 
 * Central design tokens for spacing, radii, typography, and shadows.
 * All components must reference these tokens instead of hardcoded values.
 */

/** Spacing scale (in px) */
export const SPACING = {
  /** 2px - minimal gap */
  xxs: 2,
  /** 4px - tiny gap */
  xs: 4,
  /** 8px - small gap, tray row gap */
  sm: 8,
  /** 12px - tray padding, tile padding */
  md: 12,
  /** 14px - card gap, tray row padding vertical */
  card: 14,
  /** 16px - card padding, section label margin top, screen edge padding */
  lg: 16,
  /** 18px - screen side padding */
  screen: 18,
  /** 22px - large spacing */
  xl: 22,
  /** 26px - icon tile size */
  iconTile: 26,
} as const;

/** Border radius scale (in px) */
export const RADIUS = {
  /** 8px - icon tile corner */
  iconTile: 8,
  /** 10px - hero card action buttons */
  heroButton: 10,
  /** 12px - tray/segmented track */
  tray: 12,
  /** 14px - tile grid items */
  tile: 14,
  /** 16px - primary button */
  button: 16,
  /** 18px - card */
  card: 18,
  /** 22px - hero card */
  hero: 22,
  /** 46px - stat ring (circular) */
  ring: 46,
} as const;

/** Typography scale */
export const TYPOGRAPHY = {
  fontFamily: {
    /** Outfit regular (400) */
    regular: 'Outfit_400Regular',
    /** Outfit medium (500) - row labels */
    medium: 'Outfit_500Medium',
    /** Outfit semibold (600) - card titles, buttons, section labels */
    semibold: 'Outfit_600SemiBold',
    /** Outfit bold (700) - screen titles */
    bold: 'Outfit_700Bold',
  },
  fontSize: {
    /** 12px - subtext, helper text */
    xs: 12,
    /** 13px - section labels, hero card subtext, tile labels */
    sm: 13,
    /** 14px - tray row text, tile text */
    md: 14,
    /** 16px - card titles */
    cardTitle: 16,
    /** 17px - buttons */
    button: 17,
    /** 19px - hero card title */
    heroTitle: 19,
    /** 20px - stat ring value, appointment card title */
    stat: 20,
    /** 24px - screen title */
    screenTitle: 24,
    /** 40px - Today fill-tile count */
    tileValue: 40,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    /** 0.06em for section labels */
    section: 0.06,
  },
} as const;

/** Component-specific dimensions */
export const DIMENSIONS = {
  /** Icon tile size (26x26px) */
  iconTile: 26,
  /** Stat ring outer size (46x46px) */
  ringOuter: 46,
  /** Stat ring inner size (34x34px) */
  ringInner: 34,
  /** Primary button height (56px) */
  buttonHeight: 56,
  /** Mood face size (52x52px) */
  moodFace: 52,
  /** Today fill tile height */
  statTileHeight: 150,
  /** Gap between the two Today fill tiles */
  statTileGap: 10,
} as const;

/** Shadows - currently minimal/none in Midnight Lagoon design */
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

/** Opacity values for derived colors */
export const OPACITY = {
  /** Primary color at 22% for icon tile backgrounds */
  iconTile: 0.22,
  /** White at 16% for hero card mood faces */
  heroMood: 0.16,
  /** White at 18% for hero card action buttons */
  heroButton: 0.18,
} as const;
