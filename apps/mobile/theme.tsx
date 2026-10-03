import { darkTheme as darkTokens, lightTheme as lightTokens } from "@expo/styleguide-base";
import type { Theme as NavTheme } from "@react-navigation/native";
import { DarkTheme as NavDark, DefaultTheme as NavLight } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const APPEARANCE_STORAGE_KEY = "flarecare.appearance.preference";

/**
 * Mobile brand accent — **only edit this object** to change primary CTAs, icons, tabs, nav tint,
 * weather accent, secondary labels (light), auth screen fill (light), etc.
 * Deep Lagoon teal: Option B palette for FlareCare redesign.
 */
const MOBILE_BRAND_ACCENT = {
  primary: "#0E7C7B",
  hover: "#0B6A69",
  disabled: "#BFDCDB",
} as const;

/** Brand accent for custom UI (e.g. action-sheet cancel) — same as `useFlareColors().primary` in light mode. */
export const MOBILE_BRAND_PRIMARY = MOBILE_BRAND_ACCENT.primary;

/** Danger red — Delete account link text + that modal’s Delete button only. */
export const MOBILE_DESTRUCTIVE_FILL = "#C81E1E" as const;

/** Light mode only — grouped layout: gray page, white panels (dark mode uses styleguide tokens). */
const LIGHT_GROUPED_SCREEN_BG = "#F4F7F8";
const LIGHT_GROUPED_CARD_BG = "#FFFFFF";

/** Deep Lagoon dark mode overrides for Expo styleguide tokens */
const DEEP_LAGOON_DARK_OVERRIDES = {
  background: {
    screen: "#0B0E11",
    element: "#141A1F",
    subtle: "#141A1F",
    overlay: "#1C242B",
  },
  border: {
    default: "#25313A",
  },
  text: {
    default: "#EEF3F6",
    secondary: "#9AAAB6",
    tertiary: "#5A6D79",
    danger: "#F87171",
  },
  button: {
    secondary: {
      background: "#1C242B",
      border: "#5E727E",
      text: "#FFFFFF",
    },
  },
};

/** Deep Lagoon light mode overrides for Expo styleguide tokens */
const DEEP_LAGOON_LIGHT_OVERRIDES = {
  border: {
    default: "#D8E1E4",
  },
  text: {
    default: "#0D234B",
    secondary: "#4F5D6E",
    tertiary: "#7F929B",
    danger: "#C81E1E",
  },
};

/** In-app theme: fixed light or dark (no OS follow mode). */
export type AppearancePreference = "light" | "dark";

type StyleguideTheme = typeof lightTokens;

/**
 * Single palette for Flarecare mobile. Prefer `useFlareColors()` over hard-coded hex wherever
 * screens follow light/dark.
 *
 * - **screen**: page scaffold; ScrollView/SafeArea; nav/tab bar (light: grouped gray; dark: styleguide).
 * - **card**: main Card panels; header account chip (light: white on gray screen; dark: styleguide).
 * - **surfaceSubtle**: in-card trays / inset lists (light: same as `screen` on white cards; dark: styleguide subtle).
 * - **surfaceRaised**: Daily Check-in icon circles only (contrast vs surfaceSubtle; not card).
 * - **primary**: accent icons/CTAs. **text** / **textSecondary** / **textMuted**: typography.
 */
export type FlareColors = {
  isDark: boolean;
  /** Full-page scaffold; matches styleguide `background.screen` (dark ≈ `#0C0D0E`). */
  screen: string;
  /** Elevated surfaces: main `Card` panels, headline profile bubble (not page). */
  card: string;
  /** Borders when we add hairlines again; tab divider, activity row separators. */
  cardBorder: string;
  /** Muted inset blocks: check-in cards, activity list tray. */
  surfaceSubtle: string;
  /**
   * Slightly lifted vs `surfaceSubtle`: icon discs on Daily Check-in only.
   * Do not use on `card` (same token in dark → invisible); use `screen` there if blending to page.
   */
  surfaceRaised: string;
  primary: string;
  primaryHover: string;
  primaryDisabledBg: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  link: string;
  danger: string;
  /** Danger text / icons (Delete account). Filled logout-style buttons use `primary` (cadet). */
  destructiveFill: string;
  inputBg: string;
  inputBorder: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnText: string;
  newsCardBg: string;
  newsImageBg: string;
  reportBg: string;
  reportBorder: string;
  white: string;
  /** Account Light/Dark toggles when unselected — readable on dark UI (was same-tone as screen). */
  appearanceChipInactiveBg: string;
  appearanceChipInactiveText: string;
  /** Dim layer behind `ConfirmModal` and similar dialogs. */
  modalBackdrop: string;
  /** Soft dim behind first-time instruction cards (~30% light). Not for modals. */
  instructionScrim: string;
};

function mapTokens(t: StyleguideTheme, isDark: boolean): FlareColors {
  // Apply Deep Lagoon overrides
  const overrides = isDark ? DEEP_LAGOON_DARK_OVERRIDES : DEEP_LAGOON_LIGHT_OVERRIDES;
  const bg = isDark ? overrides.background : { screen: LIGHT_GROUPED_SCREEN_BG, element: LIGHT_GROUPED_CARD_BG };
  const text = overrides.text;
  const border = overrides.border;
  
  const screen = isDark ? bg.screen : LIGHT_GROUPED_SCREEN_BG;
  const card = isDark ? bg.element : LIGHT_GROUPED_CARD_BG;

  return {
    isDark,
    screen,
    card,
    cardBorder: border.default,
    surfaceSubtle: isDark ? bg.subtle : screen,
    surfaceRaised: isDark ? bg.element : t.background.element,
    primary: MOBILE_BRAND_ACCENT.primary,
    primaryHover: MOBILE_BRAND_ACCENT.hover,
    primaryDisabledBg: MOBILE_BRAND_ACCENT.disabled,
    text: text.default,
    textSecondary: text.secondary,
    textMuted: text.tertiary,
    link: isDark ? "#5CC8C2" : "#0B6A69",
    danger: text.danger,
    destructiveFill: MOBILE_DESTRUCTIVE_FILL,
    inputBg: isDark ? bg.subtle : t.background.overlay,
    inputBorder: isDark ? "#5A6D79" : "#7F929B",
    secondaryBtnBg: isDark ? "#1C242B" : "#0D234B",
    secondaryBtnBorder: isDark ? "#5E727E" : "#0D234B",
    secondaryBtnText: "#FFFFFF",
    newsCardBg: card,
    newsImageBg: isDark ? bg.subtle : screen,
    reportBg: isDark ? bg.subtle : screen,
    reportBorder: border.default,
    white: "#ffffff",
    appearanceChipInactiveBg: isDark ? "#ffffff" : screen,
    appearanceChipInactiveText: isDark ? "#121212" : text.default,
    modalBackdrop: isDark ? "rgba(0,0,0,0.78)" : "rgba(15,23,42,0.48)",
    instructionScrim: isDark ? "rgba(0,0,0,1)" : "rgba(15,23,42,0.30)",
  };
}

function navigationTheme(colors: FlareColors, _t: StyleguideTheme): NavTheme {
  const base = colors.isDark ? NavDark : NavLight;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.screen,
      card: colors.card,
      text: colors.text,
      border: colors.cardBorder,
      notification: colors.primary,
    },
  };
}

type FlareThemeContextValue = {
  colors: FlareColors;
  tokens: StyleguideTheme;
  nav: NavTheme;
  appearancePreference: AppearancePreference;
  /** False until first persisted appearance read finishes — avoids auth/splash layout flash on cold start. */
  appearanceHydrated: boolean;
  setAppearancePreference: (pref: AppearancePreference) => Promise<void>;
};

const FlareThemeCtx = createContext<FlareThemeContextValue | null>(null);

export function FlareThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearancePreference, setAppearancePreferenceState] = useState<AppearancePreference>("light");
  const [appearanceHydrated, setAppearanceHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (cancelled) return;
        if (raw === "light" || raw === "dark") {
          setAppearancePreferenceState(raw);
        } else if (raw === "system") {
          setAppearancePreferenceState("dark");
          await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
        }
      } catch {
        // ignore read errors
      } finally {
        if (!cancelled) setAppearanceHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearancePreference = useCallback(async (pref: AppearancePreference) => {
    setAppearancePreferenceState(pref);
    try {
      await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, pref);
    } catch {
      // ignore write errors
    }
  }, []);

  const isDark = appearancePreference === "dark";
  const tokens = useMemo(() => (isDark ? darkTokens : lightTokens), [isDark]);

  const value = useMemo(() => {
    const colors = mapTokens(tokens, isDark);
    const nav = navigationTheme(colors, tokens);
    return { colors, tokens, nav, appearancePreference, appearanceHydrated, setAppearancePreference };
  }, [appearancePreference, appearanceHydrated, isDark, setAppearancePreference, tokens]);

  return <FlareThemeCtx.Provider value={value}>{children}</FlareThemeCtx.Provider>;
}

/** Safe default when used outside provider — light palette; setter is a no-op. */
export function useFlareTheme(): FlareThemeContextValue {
  const ctx = useContext(FlareThemeCtx);
  if (ctx) return ctx;
  const tokens = lightTokens;
  const colors = mapTokens(tokens, false);
  const noop = async () => {};
  return {
    colors,
    tokens,
    nav: navigationTheme(colors, tokens),
    appearancePreference: "light",
    appearanceHydrated: true,
    setAppearancePreference: noop,
  };
}

export function useFlareColors(): FlareColors {
  return useFlareTheme().colors;
}
