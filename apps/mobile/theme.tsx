import { darkTheme as darkTokens, lightTheme as lightTokens } from "@expo/styleguide-base";
import type { Theme as NavTheme } from "@react-navigation/native";
import { DarkTheme as NavDark, DefaultTheme as NavLight } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const APPEARANCE_STORAGE_KEY = "flarecare.appearance.preference";

/**
 * Moss palette. Change a value here and every screen that uses it updates.
 * Primary is amber (meds, buttons). Hydration is the soft green tile fill.
 */
const MIDNIGHT_LAGOON_ACCENT = {
  dark: {
    primary: "#E9A23B",
    hydration: "#7CC4A0",
    link: "#7CC4A0",
    accent: "#E9A23B",
    heroStart: "#2F6B4F",
    heroEnd: "#1F4E3A",
  },
  light: {
    primary: "#C27C14",
    hydration: "#2F8A62",
    link: "#2F8A62",
    accent: "#C27C14",
    heroStart: "#2F6B4F",
    heroEnd: "#1F4E3A",
  },
} as const;

/** Care appointment card. All four stay, even if only one is on screen. */
export const CARE_CARD_PALETTES = {
  clay: {
    dark: { start: "#8A4B32", end: "#5E2F1F" },
    light: { start: "#9C5538", end: "#6E3824" },
  },
  slate: {
    dark: { start: "#3D5470", end: "#26364A" },
    light: { start: "#4A6380", end: "#2E4058" },
  },
  plum: {
    dark: { start: "#5A3A5C", end: "#3A2340" },
    light: { start: "#6A4570", end: "#45294C" },
  },
  olive: {
    dark: { start: "#5B6B2E", end: "#3E4A1E" },
    light: { start: "#66783A", end: "#465424" },
  },
} as const;

export type CareCardName = keyof typeof CARE_CARD_PALETTES;

/** The Care card on screen. Clay, slate, plum, or olive. */
export const CARE_CARD_ACTIVE: CareCardName = "clay";

/** Brand primary for custom UI components (action sheets, etc.). */
export const MOBILE_BRAND_PRIMARY = MIDNIGHT_LAGOON_ACCENT.light.primary;

/** Danger red — Delete account link text + that modal’s Delete button only. */
export const MOBILE_DESTRUCTIVE_FILL = "#dc2626" as const;

/** Midnight Lagoon backgrounds. */
const MIDNIGHT_LAGOON_BG = {
  dark: {
    screen: "#0E1411",
    card: "#18211C",
    tray: "#121A16",
    border: "#2A3830",
  },
  light: {
    screen: "#F5F4EE",
    card: "#FFFFFF",
    tray: "#EEEDE5",
    border: "#DEDDD2",
  },
} as const;

/** In-app theme: fixed light or dark (no OS follow mode). */
export type AppearancePreference = "light" | "dark";

type StyleguideTheme = typeof lightTokens;

/**
 * Midnight Lagoon color system for Flarecare mobile.
 * All components must use these tokens via `useFlareColors()`.
 */
export type FlareColors = {
  isDark: boolean;
  screen: string;
  card: string;
  cardBorder: string;
  tray: string;
  primary: string;
  primaryHover: string;
  primaryDisabledBg: string;
  hydration: string;
  heroStart: string;
  heroEnd: string;
  /** Care appointment card. Darker brown than the Today green. */
  careStart: string;
  careEnd: string;
  /** Filled primary actions. Same green as the Today hero. Set back to `primary` to restore amber buttons. */
  cta: string;
  link: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  destructiveFill: string;
  inputBg: string;
  inputBorder: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnText: string;
  white: string;
  appearanceChipInactiveBg: string;
  appearanceChipInactiveText: string;
  modalBackdrop: string;
  instructionScrim: string;
  surfaceSubtle: string;
  surfaceRaised: string;
  reportBg: string;
  reportBorder: string;
};

function mapTokens(_t: StyleguideTheme, isDark: boolean): FlareColors {
  const bg = isDark ? MIDNIGHT_LAGOON_BG.dark : MIDNIGHT_LAGOON_BG.light;
  const colors = isDark ? MIDNIGHT_LAGOON_ACCENT.dark : MIDNIGHT_LAGOON_ACCENT.light;
  const textColors = {
    dark: { main: "#EEF3EF", secondary: "#9AAAA0", muted: "#9AAAA0" },
    light: { main: "#1A2420", secondary: "#5C6A62", muted: "#5C6A62" },
  };
  const text = isDark ? textColors.dark : textColors.light;

  return {
    isDark,
    screen: bg.screen,
    card: bg.card,
    cardBorder: bg.border,
    tray: bg.tray,
    primary: colors.primary,
    primaryHover: colors.primary,
    primaryDisabledBg: bg.border,
    hydration: colors.hydration,
    heroStart: colors.heroStart,
    heroEnd: colors.heroEnd,
    careStart: CARE_CARD_PALETTES[CARE_CARD_ACTIVE][isDark ? "dark" : "light"].start,
    careEnd: CARE_CARD_PALETTES[CARE_CARD_ACTIVE][isDark ? "dark" : "light"].end,
    cta: colors.heroStart,
    link: colors.link,
    accent: colors.accent,
    text: text.main,
    textSecondary: text.secondary,
    textMuted: text.muted,
    danger: isDark ? "#F87171" : "#C81E1E",
    destructiveFill: MOBILE_DESTRUCTIVE_FILL,
    inputBg: bg.tray,
    inputBorder: bg.border,
    secondaryBtnBg: bg.tray,
    secondaryBtnBorder: bg.border,
    secondaryBtnText: text.main,
    white: "#ffffff",
    appearanceChipInactiveBg: isDark ? "#ffffff" : bg.screen,
    appearanceChipInactiveText: isDark ? "#121212" : text.main,
    modalBackdrop: isDark ? "rgba(0,0,0,0.78)" : "rgba(15,23,42,0.48)",
    instructionScrim: isDark ? "rgba(0,0,0,1)" : "rgba(15,23,42,0.30)",
    surfaceSubtle: bg.tray,
    surfaceRaised: bg.card,
    reportBg: bg.tray,
    reportBorder: bg.border,
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
